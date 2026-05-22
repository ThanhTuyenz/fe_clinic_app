export const DEFAULT_SLOT_MINUTES = 12

/** Chuẩn hóa giờ khung hẹn, ví dụ "9:05" → "09:05". */
export function normalizeSlotHHMM(value) {
  const t = String(value || '').trim()
  const m = t.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return ''
  const h = String(Number(m[1])).padStart(2, '0')
  return `${h}:${m[2]}`
}

export function dateKeyFromAppointmentValue(value) {
  if (!value) return ''
  if (typeof value === 'string') {
    return value.includes('T') ? value.slice(0, 10) : value.slice(0, 10)
  }
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad2 = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function getSlotStartDate(row) {
  const dk = dateKeyFromAppointmentValue(row?.appointmentDate ?? row?.date)
  if (!dk) return null
  const st = normalizeSlotHHMM(row?.startTime)
  if (st.length < 5) return null
  const d = new Date(`${dk}T${st}:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

export function getSlotEndDate(row, slotMinutes = DEFAULT_SLOT_MINUTES) {
  const dk = dateKeyFromAppointmentValue(row?.appointmentDate ?? row?.date)
  if (!dk) return null
  const en = String(row?.endTime || '').trim()
  if (en.length >= 4) {
    const t = normalizeSlotHHMM(en)
    if (t.length < 5) return null
    const d = new Date(`${dk}T${t}:00`)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const st = normalizeSlotHHMM(row?.startTime || '00:00')
  if (st.length < 5) return null
  const d = new Date(`${dk}T${st}:00`)
  if (Number.isNaN(d.getTime())) return null
  d.setMinutes(d.getMinutes() + slotMinutes)
  return d
}

export function isPendingAppointmentPastSlot(row, slotMinutes = DEFAULT_SLOT_MINUTES) {
  if (String(row?.status || '').toLowerCase() !== 'pending') return false
  const end = getSlotEndDate(row, slotMinutes)
  if (!end) return false
  return end.getTime() < Date.now()
}
