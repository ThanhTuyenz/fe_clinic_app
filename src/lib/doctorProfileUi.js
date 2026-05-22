import { getDoctorFullName } from './user.js'

export const WEEKDAY_VI = ['Chủ nhật', 'thứ 2', 'thứ 3', 'thứ 4', 'thứ 5', 'thứ 6', 'thứ 7']

export function hashStable(s) {
  let h = 0
  const str = String(s || '')
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

/** id / mã chuyên khoa (SPEC-…) -> tên hiển thị */
export function buildSpecialtyIdLookup(rows) {
  const m = new Map()
  if (!Array.isArray(rows)) return m
  for (const s of rows) {
    const name = String(s.name || s.specialtyName || '').trim()
    if (!name) continue
    const ids = [s.id, s._id, s.specialtyID, s.specialtyId].filter(Boolean).map((x) => String(x).trim())
    for (const id of ids) {
      if (id) m.set(id, name)
    }
  }
  return m
}

function isLikelySpecialtyCode(s) {
  const t = String(s || '').trim()
  if (!t) return false
  if (/^SPEC[-/]/i.test(t)) return true
  if (/^CK[-/]?[A-Z0-9]+$/i.test(t)) return true
  return false
}

export function deriveDoctorTitle(doctor) {
  const dn = String(doctor?.displayName || '').trim()
  if (/^(TS|ThS|PGS|GS|BS|BSCK)\b/i.test(dn)) {
    const parts = dn.split(/\s+/).filter(Boolean)
    return parts.slice(0, Math.min(parts.length, 5)).join(' ') || dn
  }
  const name = getDoctorFullName(doctor)
  return name ? `BS. ${name}` : 'Bác sĩ'
}

export function deriveGenderLabel(doctor) {
  const g = doctor?.gender
  if (g === true || g === 'male' || g === 'Nam') return 'Nam'
  if (g === false || g === 'female' || g === 'Nữ') return 'Nữ'
  const s = String(g || '').trim()
  if (s) return s
  return hashStable(doctor?.id) % 2 === 0 ? 'Nam' : 'Nữ'
}

export function deriveSessions(doctorId) {
  const h = hashStable(doctorId)
  const d1 = WEEKDAY_VI[(h % 7) || 3]
  const d2 = WEEKDAY_VI[((h + 2) % 7) || 5]
  return [
    { key: 'a', label: `Sáng ${d1}`, tone: 'morning' },
    { key: 'b', label: `Chiều ${d2}`, tone: 'afternoon' },
  ]
}

const WEEKDAY_VI_CARD = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']

/** 0=CN … 6=T7 từ danh sách ngày YYYY-MM-DD (API schedule-dates). */
export function weekdayIndicesFromScheduleDates(dateKeys) {
  const set = new Set()
  for (const raw of dateKeys || []) {
    const key = String(raw || '').match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
    if (!key) continue
    const d = new Date(`${key}T12:00:00`)
    if (!Number.isNaN(d.getTime())) set.add(d.getDay())
  }
  return set
}

/**
 * Nếu API bác sĩ có mảng thứ (0=CN … 6=T7), ví dụ [1,2,3,4,5] = T2–T6.
 */
export function weekdaySetFromDoctorFields(doctor) {
  const raw = doctor?.workDays ?? doctor?.workingDays ?? doctor?.weeklyWorkdays ?? doctor?.scheduleWeekdays
  if (!Array.isArray(raw) || !raw.length) return null
  const set = new Set()
  for (const x of raw) {
    const n = Number(x)
    if (Number.isInteger(n) && n >= 0 && n <= 6) set.add(n)
  }
  return set.size ? set : null
}

/** "Từ Thứ 2 đến Thứ 6" khi các thứ liên tiếp (tuần bắt đầu Thứ 2); không thì liệt kê. */
export function formatConsultWeekdaySetVi(weekdaySet) {
  if (!weekdaySet || weekdaySet.size === 0) return ''
  const sorted = [...weekdaySet].sort((a, b) => {
    const oa = a === 0 ? 7 : a
    const ob = b === 0 ? 7 : b
    return oa - ob
  })
  const ord = sorted.map((d) => (d === 0 ? 7 : d))
  let consecutive = ord.length >= 2
  for (let i = 1; i < ord.length; i += 1) {
    if (ord[i] !== ord[i - 1] + 1) {
      consecutive = false
      break
    }
  }
  if (consecutive && sorted.length >= 2) {
    return `Từ ${WEEKDAY_VI_CARD[sorted[0]]} đến ${WEEKDAY_VI_CARD[sorted[sorted.length - 1]]}`
  }
  if (sorted.length === 1) return WEEKDAY_VI_CARD[sorted[0]]
  return sorted.map((i) => WEEKDAY_VI_CARD[i]).join(', ')
}

/** Hai ngày trong tuần (giả lập khi chưa có dữ liệu lịch). */
export function deriveConsultWeekdaysLine(doctorId) {
  const h = hashStable(doctorId)
  const i1 = h % 7
  const i2 = (h + 2) % 7
  const unique = [...new Set([i1, i2])].sort((a, b) => {
    const oa = a === 0 ? 7 : a
    const ob = b === 0 ? 7 : b
    return oa - ob
  })
  return unique.map((i) => WEEKDAY_VI_CARD[i]).join(', ')
}

export function doctorSpecialtyLine(doctor, specialtyLookup) {
  const preferName = String(doctor?.specialtyName || '').trim()
  if (preferName && !isLikelySpecialtyCode(preferName)) return preferName

  const sid = String(doctor?.specialtyID || doctor?.specialtyId || '').trim()
  if (sid && specialtyLookup?.has?.(sid)) return specialtyLookup.get(sid)

  const fromSpec = String(doctor?.specialty || '').trim()
  if (fromSpec && !isLikelySpecialtyCode(fromSpec)) return fromSpec
  if (fromSpec && specialtyLookup?.has?.(fromSpec)) return specialtyLookup.get(fromSpec)

  if (preferName) return preferName
  return fromSpec || '—'
}

/** Lọc bác sĩ theo specialtyFilterKey như ChooseDoctor ('' | id:x | name:y). */
export function filterDoctorsBySpecialtyFilterKey(doctors, specialtyFilterKey, specialties, specLookup) {
  const rows = Array.isArray(doctors) ? doctors.slice() : []
  const fk = String(specialtyFilterKey || '').trim()
  if (!fk) return rows

  if (fk.startsWith('id:')) {
    const id = fk.slice(3)
    const spec = (specialties || []).find((s) => String(s.id || '') === id)
    const specName = String(spec?.name || '').trim().toLowerCase()
    return rows.filter((d) => {
      const sid = String(d.specialtyID || d.specialtyId || '').trim()
      if (sid === id) return true
      if (!specName) return false
      const dn = doctorSpecialtyLine(d, specLookup).toLowerCase()
      if (!dn) return false
      return dn === specName || dn.includes(specName) || specName.includes(dn)
    })
  }

  if (fk.startsWith('name:')) {
    const low = fk.slice(5)
    return rows.filter((d) => doctorSpecialtyLine(d, specLookup).toLowerCase() === low)
  }

  return rows
}

export function doctorDeptLine(doctor, specialtyLookup) {
  let dept = String(doctor?.deptName || doctor?.departmentName || '').trim()
  if (dept && specialtyLookup?.has?.(dept)) dept = specialtyLookup.get(dept)
  else if (dept && isLikelySpecialtyCode(dept)) dept = ''

  const spec = doctorSpecialtyLine(doctor, specialtyLookup)
  if (dept && dept !== spec) return `Khoa ${dept}`
  if (spec && spec !== '—') return spec
  return 'Chuyên khoa'
}

/** Phí khám mặc định (VND) — khớp fe_clinic_ad / be_clinic. */
export const DEFAULT_CONSULTATION_FEE = 150_000

/** Số tiền phí khám (VND) từ API hoặc mặc định 150.000 đ. */
export function getDoctorConsultationFee(doctor) {
  if (!doctor || typeof doctor !== 'object') return DEFAULT_CONSULTATION_FEE
  const candidates = [
    doctor.consultationFee,
    doctor.consultationPrice,
    doctor.examFee,
    doctor.price,
    doctor.fee,
  ]
  for (const c of candidates) {
    if (c == null || c === '') continue
    const n = Number(String(c).replace(/[^\d]/g, ''))
    if (Number.isFinite(n) && n > 0) return Math.round(n)
  }
  return DEFAULT_CONSULTATION_FEE
}

/** Hiển thị phí khám kiểu Việt Nam, ví dụ "250.000 đ". */
export function formatDoctorPriceVi(doctorOrAmount) {
  const amount =
    typeof doctorOrAmount === 'number'
      ? doctorOrAmount
      : getDoctorConsultationFee(doctorOrAmount)
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return ''
  return `${n.toLocaleString('vi-VN')} đ`
}

/** Parse bio lines that look like education (year prefix or degree keywords). */
export function parseTrainingBullets(doctor) {
  const edu = doctor?.education ?? doctor?.training ?? doctor?.degrees
  if (Array.isArray(edu) && edu.length) return edu.map((x) => String(x).trim()).filter(Boolean)

  const bio = String(doctor?.bio || '').trim()
  if (!bio) return []

  const lines = bio.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const out = []
  const reYear = /^(19|20)\d{2}\s*[:\-–.]\s*\S/m
  const key =
    /tiến sĩ|thạc sĩ|bác sĩ|chuyên khoa|đại học|bác sĩ nội trú| BS\.|ThS\.|TS\.|đào tạo|tốt nghiệp/i

  for (const line of lines) {
    const clean = line.replace(/^[•\u2022\-*]\s*/, '')
    if (reYear.test(clean) || (key.test(clean) && clean.length > 12)) out.push(clean)
  }
  if (out.length) return out.slice(0, 12)
  if (lines[0]) return [lines[0]]
  return []
}
