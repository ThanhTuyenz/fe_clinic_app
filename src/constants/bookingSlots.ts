import { Doctor } from '../types/doctor'

export function filterAfterHoursSlots<T extends { startTime?: string } | string>(slots: T[]): T[] {
  return slots.filter((s) => {
    const timeStr = typeof s === 'string' ? s : s.startTime
    if (!timeStr) return false
    const hour = parseInt(timeStr.slice(0, 2), 10)
    const min = parseInt(timeStr.slice(3, 5), 10)
    return hour > 17 || (hour === 17 && min >= 30)
  })
}

export function extractDoctorSpecialtyId(doctor?: Doctor | null): string | number | undefined {
  if (!doctor) return undefined
  return (
    doctor.specialtyId ??
    doctor.specialty_id ??
    (typeof doctor.specialty === 'object' ? doctor.specialty?.id : undefined)
  )
}
