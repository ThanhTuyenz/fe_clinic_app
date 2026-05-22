const pad2 = (n) => String(n).padStart(2, '0')

export function toDateKey(d) {
  const x = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(x.getTime())) return ''
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`
}

export const WEEKDAY_VI_GRID = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/** Recurring public holidays (month-day), áp dụng mọi năm */
export const VN_HOLIDAY_MD = new Set(['01-01', '30-04', '01-05', '02-09', '03-09'])

export function holidayMdForDate(d) {
  return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function isVnPublicHoliday(d) {
  return VN_HOLIDAY_MD.has(holidayMdForDate(d))
}

export function buildMonthGrid(year, month) {
  const first = new Date(year, month - 1, 1)
  const lead = first.getDay()
  const lastDay = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < lead; i += 1) cells.push({ kind: 'pad' })
  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month - 1, day)
    cells.push({ kind: 'day', date, day, weekday: date.getDay() })
  }
  while (cells.length % 7 !== 0) cells.push({ kind: 'pad' })
  return cells
}

export function monthRangeKeys(year, month) {
  const from = toDateKey(new Date(year, month - 1, 1))
  const to = toDateKey(new Date(year, month, 0))
  return { from, to }
}

export function weekdayViLong(d) {
  const n = d.getDay()
  return ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][n] || ''
}
