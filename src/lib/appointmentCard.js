import { formatDateVi, getDoctorFullName, getUserDisplayName, resolvePatientCode } from './user.js'

export function buildTicketCode(appointmentId, appointmentDate) {
  const id = String(appointmentId).replace(/[^a-fA-F0-9]/g, '')
  const d = new Date(appointmentDate)
  if (Number.isNaN(d.getTime())) return `YMA${id.slice(-10).toUpperCase()}`
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const suffix = (id.slice(-6) || '000000').toUpperCase()
  return `YMA${yy}${mm}${dd}${suffix}`
}

function getPatientName(profile) {
  if (!profile || typeof profile !== 'object') return ''
  const first = String(profile?.firstName || '').trim()
  const last = String(profile?.lastName || '').trim()
  const full = `${last} ${first}`.trim()
  if (full) return full
  return String(profile?.displayName || profile?.fullName || profile?.name || '').trim()
}

/**
 * @param {object} appointment
 * @param {object | null} sessionUser
 */
export function resolveAppointmentPatientLine(appointment, sessionUser) {
  const profile =
    appointment?.patient && typeof appointment.patient === 'object' ? appointment.patient : sessionUser
  const fallbackUser = sessionUser && typeof sessionUser === 'object' ? sessionUser : null
  const name = getPatientName(profile) || getUserDisplayName(fallbackUser) || '—'
  const code = resolvePatientCode(profile || fallbackUser)
  return { name, code }
}

export function getTicketDisplay(appointment) {
  const id = String(appointment?.id || appointment?._id || '')
  const raw = String(appointment?.ticket || '').trim()
  if (raw) return raw.toUpperCase()
  const date = appointment?.appointmentDate || appointment?.date
  return buildTicketCode(id, date)
}

export function getAppointmentServiceLine(appointment) {
  const s =
    String(appointment?.serviceName || appointment?.service?.name || appointment?.visitType || '').trim() ||
    String(appointment?.note || '').trim()
  if (s) return s
  return 'Khám ngoại trú'
}

export function getAppointmentSpecialtyLine(appointment) {
  const d = appointment?.doctor
  if (!d || typeof d !== 'object') return '—'
  const spec =
    String(d.specialtyName || d.specialty || d.department?.name || d.departmentName || d.department || '').trim()
  return spec || '—'
}

export function getClinicTitle() {
  return 'PHÒNG KHÁM VITACARE'
}
