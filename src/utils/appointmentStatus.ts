export const canCancelAppointment = (status?: string) => ['HOLD', 'PENDING', 'CONFIRMED'].includes(String(status).toUpperCase())
export const canShowCheckInQr = (appointment: { status?: string; qrPayload?: string; isTelehealth?: boolean; invoiceStatus?: string | null; paymentStatus?: string | null; bookingMethod?: { code?: string } | null }) =>
  !appointment.isTelehealth && appointment.bookingMethod?.code !== 'ONLINE_CONSULTATION'
  && !['REFUNDED', 'REFUND_PENDING', 'VOID', 'VOIDED', 'CANCELLED'].includes(String(appointment.invoiceStatus || '').toUpperCase())
  && !['REFUNDED', 'REFUND_PENDING', 'CANCELLED'].includes(String(appointment.paymentStatus || '').toUpperCase())
  && ['CONFIRMED', 'CHECKED_IN'].includes(String(appointment.status).toUpperCase()) && Boolean(appointment.qrPayload)
export function appointmentStatusTitle(status?: string) {
  return ({ HOLD: 'Đang giữ chỗ, chờ thanh toán', PENDING: 'Chờ xác nhận', CONFIRMED: 'Đã xác nhận lịch khám', CHECKED_IN: 'Đã tiếp nhận', IN_EXAMINATION: 'Đang khám', COMPLETED: 'Đã hoàn thành khám', CANCELLED: 'Lịch khám đã hủy', NO_SHOW: 'Không đến khám', EXPIRED: 'Đã hết hạn giữ chỗ' } as Record<string, string>)[String(status).toUpperCase()] || 'Thông tin lịch khám'
}
