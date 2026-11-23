import dayjs from 'dayjs'
import 'dayjs/locale/vi'

dayjs.locale('vi')

export function formatDateVi(date: string | Date | undefined): string {
  if (!date) return ''
  return dayjs(date).format('DD/MM/YYYY')
}

export function formatDateTimeVi(date: string | Date | undefined): string {
  if (!date) return ''
  return dayjs(date).format('HH:mm - DD/MM/YYYY')
}

export function formatDayOfWeek(date: string | Date | undefined): string {
  if (!date) return ''
  const d = dayjs(date)
  const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
  return days[d.day()] || ''
}

export function getTodayDateString(): string {
  return dayjs().format('YYYY-MM-DD')
}

/** Keep birth dates as calendar dates, including values read from ISO API responses. */
export function normalizeBirthDate(value: string): string | null {
  const input = typeof value === 'string' ? value.trim() : ''
  if (!/^\d{4}-\d{2}-\d{2}(?:T.+)?$/.test(input)) return null
  if (input.length > 10 && !Number.isFinite(Date.parse(input))) return null
  const dateOnly = input.slice(0, 10)
  const date = new Date(`${dateOnly}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dateOnly) return null
  return dateOnly <= getTodayDateString() ? dateOnly : null
}

export function getTomorrowDateString(): string {
  return dayjs().add(1, 'day').format('YYYY-MM-DD')
}

export function formatCurrencyVi(amount: number | string | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (num == null || isNaN(num)) return 'Đang cập nhật'
  return `${num.toLocaleString('vi-VN')} đ`
}
