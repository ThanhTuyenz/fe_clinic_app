import { Doctor } from './doctor'
import { User } from './user'

export type AppointmentStatus =
  | 'HOLD'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_EXAMINATION'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'in_progress'

export interface TimeSlot {
  id: string
  time?: string
  startTime: string
  endTime?: string
  capacity?: number
  occupiedCount?: number
  remainingCapacity?: number
  isAvailable: boolean
  period?: 'morning' | 'afternoon'
}

export interface Appointment {
  id: string
  isTelehealth?: boolean
  bookingMethod?: { code: string; name?: string } | null
  _id?: string
  code?: string
  bookingCode?: string | null
  doctor_id?: string | number
  doctorId?: string | null
  doctor?: { id: string; fullName: string; full_name?: string; name?: string } | Doctor | null
  patient_id?: string | number
  patient?: { id: string; fullName: string } | User
  appointment_date?: string
  appointmentDate?: string | null
  appointment_time?: string
  startTime?: string | null
  endTime?: string | null
  slot?: string
  status: AppointmentStatus | string
  reason?: string
  symptoms?: string
  symptomsDescription?: string
  notes?: string
  medical_records?: string[]
  prescription_images?: string[]
  qr_code?: string
  qrToken?: string
  qrPayload?: string
  consultation_fee?: number
  totalAmount?: number
  paymentStatus?: string | null
  invoiceStatus?: string | null
  queueNumber?: number | null
  created_at?: string
  createdAt?: string
  department_name?: string
  specialty?: string | null
  service?: { id: string; name: string } | null
  healthPackage?: { id: string; name: string } | null
  branch?: { id: string; name: string; address?: string } | null
  room?: { id: string; code: string; name: string } | null
}

export interface CheckInPass {
  isTelehealth?: boolean
  bookingMethod?: { code: string; name?: string } | null
  appointmentId: string
  bookingCode: string
  qrPayload: string | null
  expiresAt: string
  status: string
  queueNumber: number | null
  estimatedQueueNumber: number | null
  appointmentDate: string
  startTime: string
  endTime: string
  room: { id: string; code: string; name: string } | null
  branch: { id: string; name: string; address?: string }
  doctor: { id: string; fullName: string; academicRank?: string | null } | null
  specialty?: string | null
  healthPackage?: { id: string; name: string } | null
  patient: {
    id: string
    fullName: string
    gender?: string | null
    dateOfBirth?: string | null
    nationalId?: string | null
    phoneNumber?: string | null
  }
  totalAmount?: number
  paymentStatus?: string | null
}

export interface HealthPackage {
  id: string
  code?: string
  slug?: string
  name: string
  description?: string
  price: number
  durationMin?: number
  specialtyId?: number
  receptionSchedules?: { branchId: string; dayOfWeek: number; sessions: ("MORNING" | "AFTERNOON" | "EVENING")[] }[];
  services?: any[]
  image?: string
}

export type BookingMethodCode =
  | 'SPECIALTY_EXAM'
  | 'CONSULTATION'
  | 'ONLINE_CONSULTATION'
  | 'FOLLOWUP_EXAM'
  | 'FAMILY_BOOKING'
  | 'AFTER_HOURS'
  | 'HEALTH_PACKAGE'

export interface BookingDraft {
  branchId?: string
  bookingMethod?: BookingMethodCode
  specialty?: any | null
  specialtyService?: any | null
  healthPackage?: HealthPackage | null
  isAfterHours?: boolean
  doctor: Doctor | null
  date: string // YYYY-MM-DD
  slot: string // e.g. "08:30"
  slotId?: string // UUID của khung giờ thực tế từ API
  patientProfileId?: string
  patientType: 'self' | 'relative'
  patientName: string
  patientPhone: string
  patientDob: string
  patientGender: 'male' | 'female' | 'other'
  patientCccd?: string
  symptoms: string
  prescriptionImages: string[]
  selectedProfile?: any | null
  voucherCode?: string
  appliedVoucher?: {
    code: string
    name?: string
    discountAmount: number
    discountType?: string
    discountValue?: number
  } | null
}
