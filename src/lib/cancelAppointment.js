export const CANCEL_REASON_PRESETS = [
  { id: 'busy', label: 'Bận việc đột xuất, không đến khám được' },
  { id: 'recovered', label: 'Đã khỏi bệnh / không cần khám nữa' },
  { id: 'reschedule', label: 'Muốn đổi bác sĩ hoặc thời gian khác' },
  { id: 'other', label: 'Lý do khác (ghi chú bên dưới)' },
]

export function resolveCancelReasonText(presetId, otherText) {
  if (presetId === 'other') {
    return String(otherText || '').trim()
  }
  const preset = CANCEL_REASON_PRESETS.find((p) => p.id === presetId)
  return preset?.label || ''
}

export function validateCancelReason(presetId, otherText) {
  const text = resolveCancelReasonText(presetId, otherText)
  if (!text) {
    return presetId === 'other' ? 'Vui lòng nhập lý do hủy.' : 'Vui lòng chọn lý do hủy.'
  }
  return ''
}
