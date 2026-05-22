import { getApiBase, parseJsonResponse } from './apiBase.js'

async function parseJson(res) {
  return parseJsonResponse(res)
}

function httpError(message, res, data) {
  const err = new Error(message || 'Yêu cầu thất bại.')
  err.status = res?.status
  err.data = data
  return err
}

/** Chuẩn hóa về YYYY-MM-DD để khớp lịch local / availability */
export function normalizeScheduleDateKey(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const inner =
      value.date ?? value.day ?? value.appointmentDate ?? value.value ?? value.dateKey ?? value.scheduleDate
    if (inner != null && inner !== value) return normalizeScheduleDateKey(inner)
  }
  const s = String(value).trim()
  const isoStart = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoStart) {
    const pad = (n) => String(Number(n)).padStart(2, '0')
    return `${isoStart[1]}-${pad(isoStart[2])}-${pad(isoStart[3])}`
  }
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slash) {
    const pad = (n) => String(Number(n)).padStart(2, '0')
    return `${slash[3]}-${pad(slash[2])}-${pad(slash[1])}`
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  }
  return ''
}

function extractScheduleDatesArray(data) {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const buckets = [data.dates, data.availableDates, data.scheduleDates, data.days, data.data]
  for (const b of buckets) {
    if (Array.isArray(b)) return b
  }
  return []
}

export async function createAppointment({ token, doctorId, appointmentDate, startTime, note }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      source: 'online',
      bookingSource: 'online',
      doctorId,
      appointmentDate,
      startTime,
      note: note || '',
    }),
  })

  const data = await parseJson(res)
  if (!res.ok) {
    throw httpError(data.message || 'Đặt lịch thất bại.', res, data)
  }
  const appointment = data?.appointment || data
  return {
    ...data,
    appointment,
    message: data?.message || 'Đăng ký lịch khám thành công.',
  }
}

export async function cancelAppointment({ token, appointmentId, cancelReason }) {
  const base = getApiBase()
  const id = String(appointmentId || '').trim()
  const res = await fetch(`${base}/api/appointments/${encodeURIComponent(id)}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      cancelReason: String(cancelReason || '').trim(),
    }),
  })

  const data = await parseJson(res)
  if (!res.ok) {
    throw httpError(data.message || 'Không hủy được lịch khám.', res, data)
  }
  return data
}

export async function listMyAppointments({ token }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/appointments/my`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await parseJson(res)
  if (!res.ok) {
    throw httpError(data.message || 'Không lấy được lịch khám.', res, data)
  }
  return data?.appointments || []
}

/** Chuẩn hóa danh sách giờ trống từ API availability. */
export function parseAvailabilitySlots(data) {
  const raw = data?.slots ?? data?.freeSlots ?? data?.availableSlots ?? []
  if (!Array.isArray(raw)) return []
  return raw
    .map((slot) => (typeof slot === 'string' ? slot : slot?.startTime))
    .map((t) => String(t || '').trim().slice(0, 5))
    .filter(Boolean)
    .sort()
}

export async function getAvailability({ token, doctorId, date }) {
  const base = getApiBase()
  const qs = new URLSearchParams({
    doctorId: String(doctorId || '').trim(),
    date: String(date || '').trim(),
  })

  const res = await fetch(`${base}/api/appointments/availability?${qs.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await parseJson(res)
  if (!res.ok) {
    throw httpError(data.message || 'Không lấy được khung giờ.', res, data)
  }
  return {
    ...data,
    slots: parseAvailabilitySlots(data),
    shifts: Array.isArray(data?.shifts) ? data.shifts : [],
  }
}

export async function getDoctorScheduleDates({ token, doctorId, from, to }) {
  const base = getApiBase()
  const qs = new URLSearchParams({
    doctorId: String(doctorId || '').trim(),
  })
  if (from) qs.set('from', String(from).trim())
  if (to) qs.set('to', String(to).trim())

  const res = await fetch(`${base}/api/appointments/schedule-dates?${qs.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })

  const data = await parseJson(res)
  if (!res.ok) {
    throw httpError(data.message || 'Không lấy được ngày có lịch.', res, data)
  }
  const raw = extractScheduleDatesArray(data)
  const keys = raw.map(normalizeScheduleDateKey).filter(Boolean)
  return [...new Set(keys)]
}

export async function getAppointment({ token, appointmentId }) {
  const rows = await listMyAppointments({ token })
  const id = String(appointmentId || '').trim()
  const row = rows.find((item) => String(item.id || item._id) === id)
  if (!row) {
    throw httpError('Không tìm thấy lịch khám.', { status: 404 }, null)
  }
  return row
}
