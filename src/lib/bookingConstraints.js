import { listMyAppointments } from '../api/appointments.js'
import { getAppointmentStatusKind } from './appointmentStatus.js'
import { getAppointmentDoctorId } from './appointmentRebook.js'
import {
  DEFAULT_SLOT_MINUTES,
  dateKeyFromAppointmentValue,
  getSlotEndDate,
  getSlotStartDate,
  normalizeSlotHHMM,
} from '../utils/appointmentExpiry.js'

/** Thông báo khi đã có lịch còn hiệu lực với cùng bác sĩ (đã đặt lịch, chưa qua buổi khám). */
export const DUPLICATE_PENDING_DOCTOR_MESSAGE =
  'Hệ thống không cho phép đăng ký thêm lịch khám với bác sĩ này: bạn đã có lịch đã đặt và buổi khám chưa diễn ra. Sau khi đã khám xong, bạn có thể đặt lịch tái khám.'

/** Trùng khung giờ với lịch đang hiệu lực (kể cả bác sĩ khác). */
export const SLOT_OVERLAP_APPOINTMENT_MESSAGE =
  'Hệ thống không cho phép đăng ký: khung giờ này trùng ngày và thời gian với lịch khám đang hiệu lực của bạn (kể cả với bác sĩ khác).'

/**
 * Lịch chưa hủy / chưa hoàn tất và buổi khám coi như chưa qua (theo ngày giờ có trong dữ liệu).
 * @param {unknown} row
 */
function appointmentStillBlocksDuplicateDoctorBooking(row) {
  const kind = getAppointmentStatusKind(row?.status)
  if (kind === 'cancelled' || kind === 'done') return false

  const end = getSlotEndDate(row)
  if (end) return end.getTime() > Date.now()

  const dk = dateKeyFromAppointmentValue(row?.appointmentDate ?? row?.date)
  if (!dk) return false
  const slotDay = new Date(`${dk}T12:00:00`)
  if (Number.isNaN(slotDay.getTime())) return false
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  return slotDay.getTime() >= startOfToday.getTime()
}

/**
 * Có lịch trùng cùng bác sĩ: đã đặt lịch, buổi khám chưa kết thúc.
 * @param {unknown[] | null | undefined} appointments
 * @param {string} doctorId
 * @returns {unknown | null}
 */
export function findBlockingPendingAppointmentForDoctor(appointments, doctorId) {
  const did = String(doctorId || '').trim()
  if (!did || !Array.isArray(appointments)) return null
  for (const row of appointments) {
    if (!appointmentStillBlocksDuplicateDoctorBooking(row)) continue
    const apDoc = getAppointmentDoctorId(row)
    if (String(apDoc || '').trim() !== did) continue
    return row
  }
  return null
}

function parseProposedSlotInterval(appointmentDate, startTime, slotMinutes = DEFAULT_SLOT_MINUTES) {
  const dk = String(appointmentDate || '').slice(0, 10)
  const st = normalizeSlotHHMM(startTime)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dk) || st.length < 5) return null
  const start = new Date(`${dk}T${st}:00`)
  if (Number.isNaN(start.getTime())) return null
  const end = new Date(start.getTime())
  end.setMinutes(end.getMinutes() + slotMinutes)
  return { start, end }
}

function existingActiveInterval(row) {
  const start = getSlotStartDate(row)
  const end = getSlotEndDate(row)
  if (!start || !end) return null
  return { start, end }
}

function intervalsOverlap(a, b) {
  return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime()
}

/**
 * Ràng buộc trước khi tạo lịch: cùng bác sĩ còn lịch hiệu lực, hoặc trùng khung giờ với lịch hiệu lực (mọi bác sĩ).
 * @param {unknown[] | null | undefined} appointments
 * @param {{ doctorId: string, appointmentDate: string, startTime: string }} param1
 * @returns {{ kind: 'doctor' | 'overlap', appointment: unknown } | null}
 */
export function findBlockingForNewSlot(appointments, { doctorId, appointmentDate, startTime }) {
  const rows = Array.isArray(appointments) ? appointments : []
  const did = String(doctorId || '').trim()

  const doctorBlock = did ? findBlockingPendingAppointmentForDoctor(rows, did) : null
  if (doctorBlock) return { kind: 'doctor', appointment: doctorBlock }

  const proposed = parseProposedSlotInterval(appointmentDate, startTime)
  if (!proposed) return null

  for (const row of rows) {
    if (!appointmentStillBlocksDuplicateDoctorBooking(row)) continue
    const ex = existingActiveInterval(row)
    if (!ex) continue
    if (intervalsOverlap(proposed, ex)) return { kind: 'overlap', appointment: row }
  }
  return null
}

/**
 * @param {string} token
 * @param {string} doctorId
 * @returns {Promise<unknown | null>}
 */
export async function fetchBlockingPendingForDoctor(token, doctorId) {
  const rows = await listMyAppointments({ token })
  return findBlockingPendingAppointmentForDoctor(Array.isArray(rows) ? rows : [], doctorId)
}

/**
 * @param {string} token
 * @param {{ doctorId: string, appointmentDate: string, startTime: string }} params
 * @returns {Promise<{ kind: 'doctor' | 'overlap', appointment: unknown } | null>}
 */
export async function fetchBlockingForNewSlot(token, params) {
  const rows = await listMyAppointments({ token })
  return findBlockingForNewSlot(Array.isArray(rows) ? rows : [], params)
}
