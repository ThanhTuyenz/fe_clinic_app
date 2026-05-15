/** @typedef {'pending' | 'confirmed' | 'done' | 'cancelled'} AppointmentStatusKind */

const EXAMINED = new Set(['examined', 'completed', 'done'])

/**
 * @param {string | undefined | null} status
 * @returns {AppointmentStatusKind}
 */
export function getAppointmentStatusKind(status) {
  const s = String(status || '')
    .toLowerCase()
    .trim()
  if (s === 'cancelled' || s === 'canceled') return 'cancelled'
  if (EXAMINED.has(s)) return 'done'
  if (s === 'confirmed') return 'confirmed'
  return 'pending'
}

/**
 * @param {string | undefined | null} status
 */
export function getAppointmentStatusLabel(status) {
  const k = getAppointmentStatusKind(status)
  if (k === 'cancelled') return 'Đã hủy'
  if (k === 'done') return 'Đã khám'
  if (k === 'confirmed') return 'Đã xác nhận'
  return 'Chờ xác nhận'
}

/** Gợi ý màu badge / chú thích (không phụ thuộc theme RN) */
export const appointmentStatusPalette = {
  pending: { bg: '#fffbeb', text: '#b45309', border: '#fcd34d' },
  confirmed: { bg: 'rgba(13, 148, 136, 0.12)', text: '#0f766e', border: '#5eead4' },
  done: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  cancelled: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
}

/** Các dòng chú thích cố định cho UI */
export const APPOINTMENT_STATUS_LEGEND = [
  { kind: 'pending', label: 'Chờ xác nhận', hint: 'Phòng khám sẽ duyệt lịch' },
  { kind: 'confirmed', label: 'Đã xác nhận', hint: 'Vui lòng đến đúng giờ' },
  { kind: 'done', label: 'Đã khám', hint: 'Hoàn tất buổi khám' },
  { kind: 'cancelled', label: 'Đã hủy', hint: 'Lịch không còn hiệu lực' },
]
