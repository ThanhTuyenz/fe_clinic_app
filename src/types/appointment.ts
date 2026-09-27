import { Doctor } from './doctor'
import { User } from './user'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'in_progress'

export interface TimeSlot {
  id: string | number
  time: string // e.g. "08:00 - 08:30"
  startTime?: string
  endTime?: string
  isAvailable: boolean
  period?: 'morning' | 'afternoon'
}

export interface Appointment {
  id: string | number
  _id?: string
  code?: string
  doctor_id?: string | number
  doctor?: Doctor
  patient_id?: string | number
  patient?: User
  appointment_date: string // YYYY-MM-DD
  appointment_time?: string
  startTime?: string
  slot?: string
  status: AppointmentStatus
  reason?: string
  symptoms?: string
  notes?: string
  medical_records?: string[]
  prescription_images?: string[]
  qr_code?: string
  consultation_fee?: number
  created_at?: string
  department_name?: string
}

export interface BookingDraft {
  doctor: Doctor | null
  date: string // YYYY-MM-DD
  slot: string // e.g. "08:30 - 09:00"
  patientType: 'self' | 'relative'
  patientName: string
  patientPhone: string
  patientDob: string
  patientGender: 'male' | 'female' | 'other'
  patientCccd?: string
  symptoms: string
  prescriptionImages: string[]
}
