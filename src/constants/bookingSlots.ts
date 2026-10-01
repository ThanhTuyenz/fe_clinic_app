import { Doctor } from '../types/doctor'

export interface DefaultSlotItem {
  id: string
  startTime: string
  endTime: string
  isAvailable: boolean
}

export const DEFAULT_BOOKING_SLOTS: DefaultSlotItem[] = [
  { id: 'default-slot-0', startTime: '08:00', endTime: '08:30', isAvailable: true },
  { id: 'default-slot-1', startTime: '08:30', endTime: '09:00', isAvailable: true },
  { id: 'default-slot-2', startTime: '09:00', endTime: '09:30', isAvailable: true },
  { id: 'default-slot-3', startTime: '09:30', endTime: '10:00', isAvailable: true },
  { id: 'default-slot-4', startTime: '10:00', endTime: '10:30', isAvailable: true },
  { id: 'default-slot-5', startTime: '10:30', endTime: '11:00', isAvailable: true },
  { id: 'default-slot-6', startTime: '11:00', endTime: '11:30', isAvailable: true },
  { id: 'default-slot-7', startTime: '13:30', endTime: '14:00', isAvailable: true },
  { id: 'default-slot-8', startTime: '14:00', endTime: '14:30', isAvailable: true },
  { id: 'default-slot-9', startTime: '14:30', endTime: '15:00', isAvailable: true },
  { id: 'default-slot-10', startTime: '15:00', endTime: '15:30', isAvailable: true },
  { id: 'default-slot-11', startTime: '15:30', endTime: '16:00', isAvailable: true },
  { id: 'default-slot-12', startTime: '16:00', endTime: '16:30', isAvailable: true },
  { id: 'default-slot-13', startTime: '16:30', endTime: '17:00', isAvailable: true },
  { id: 'default-slot-14', startTime: '17:30', endTime: '18:00', isAvailable: true },
  { id: 'default-slot-15', startTime: '18:00', endTime: '18:30', isAvailable: true },
  { id: 'default-slot-16', startTime: '18:30', endTime: '19:00', isAvailable: true },
  { id: 'default-slot-17', startTime: '19:00', endTime: '19:30', isAvailable: true },
  { id: 'default-slot-18', startTime: '19:30', endTime: '20:00', isAvailable: true },
  { id: 'default-slot-19', startTime: '20:00', endTime: '20:30', isAvailable: true },
]

export function filterAfterHoursSlots<T extends { startTime?: string } | string>(slots: T[]): T[] {
  return slots.filter((s) => {
    const timeStr = typeof s === 'string' ? s : s.startTime
    if (!timeStr) return false
    const hour = parseInt(timeStr.slice(0, 2), 10)
    const min = parseInt(timeStr.slice(3, 5), 10)
    return hour > 17 || (hour === 17 && min >= 30)
  })
}

export function generateFallbackDates(daysCount = 14): string[] {
  const dates: string[] = []
  const base = new Date()
  for (let i = 1; i <= daysCount; i++) {
    const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    dates.push(`${yyyy}-${mm}-${dd}`)
  }
  return dates
}

export function extractDoctorSpecialtyId(doctor?: Doctor | null): string | number | undefined {
  if (!doctor) return undefined
  return (
    doctor.specialtyId ??
    doctor.specialty_id ??
    (typeof doctor.specialty === 'object' ? doctor.specialty?.id : undefined)
  )
}
