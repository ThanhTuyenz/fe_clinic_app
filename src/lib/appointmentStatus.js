/** @typedef {'booked' | 'done' | 'cancelled'} AppointmentStatusKind */

const EXAMINED = new Set(['examined', 'completed', 'done'])

/**
 * Nhóm trạng thái cho UI bệnh nhân (pending / confirmed gộp thành booked).
 * @param {string | undefined | null} status
 * @returns {AppointmentStatusKind}
 */
export function getAppointmentStatusKind(status) {
  const s = String(status || '')
    .toLowerCase()
    .trim()
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  if (EXAMINED.has(s)) return 'done'
  return 'booked'
}

/**
 * @param {string | undefined | null} status
 */
export function getAppointmentStatusLabel(status) {
  const k = getAppointmentStatusKind(status)
  if (k === 'cancelled') return 'Đã hủy'
  if (k === 'done') return 'Đã khám'
  return 'Đã đặt lịch'
}

/** Màu badge trạng thái (bg / chữ / viền / chấm) */
export const appointmentStatusPalette = {
  booked: { bg: '#e6f7f4', text: '#0d9488', border: '#99f6e4', dot: '#14b8a6' },
  done: { bg: '#eef4ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  cancelled: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca', dot: '#ef4444' },
}

/** Các dòng chú thích cố định cho UI bệnh nhân */
export const APPOINTMENT_STATUS_LEGEND = [
  { kind: 'booked', label: 'Đã đặt lịch', hint: 'Lịch đã được ghi nhận. Vui lòng đến đúng giờ khám.' },
  { kind: 'done', label: 'Đã khám', hint: 'Hoàn tất buổi khám' },
  { kind: 'cancelled', label: 'Đã hủy', hint: 'Lịch không còn hiệu lực' },
]
