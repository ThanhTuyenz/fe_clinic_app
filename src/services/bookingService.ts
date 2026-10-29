import { api, unwrapNestResponse } from './api'
import { Doctor } from '../types/doctor'
import { resolveDoctorAvatarUrl } from './doctorService'

export interface BookingMethod {
  id: string
  bookingMethodId?: string
  code: string
  type?: string
  displayName: string
  description?: string | null
  isEnabled: boolean
}

export type BookingFlow =
  | 'doctor'
  | 'specialty'
  | 'health-package'
  | 'online'
  | 'after-hours'
  | 'facility'

export interface BookingInitResponse {
  flow: string
  bookingMethodCode: string
  branches: any[]
  selectedBranch?: any | null
  bookingMethods?: any[]
  specialties?: any[]
  doctors?: Doctor[]
  services?: any[]
  healthPackages?: any[]
}

export interface BookingSlotDoctor {
  slotId: string
  doctorId: string
  doctorName: string
  academicRank?: string | null
  avatarUrl?: string | null
  experienceYears?: number | null
  consultationFee: number
  roomId?: string | null
  roomName?: string | null
  remainingSlots: number
}

export interface BookingSlot {
  startTime: string
  endTime: string
  label: string
  period: 'MORNING' | 'AFTERNOON' | 'EVENING'
  totalCapacity: number
  occupiedCount: number
  remainingSlots: number
  isFull: boolean
  representativeSlotId: string
  doctors: BookingSlotDoctor[]
}

export interface BookingSlotsResponse {
  date: string | null
  availableDates: string[]
  totalAvailableSlots: number
  summary: { morning: number; afternoon: number; evening: number }
  slots: BookingSlot[]
}

function normalizeDoctor(raw: any): Doctor {
  const specialty = raw.specialties?.[0] || {}
  return {
    ...raw,
    id: raw.id || raw._id,
    fullName: raw.fullName || raw.displayName || raw.name || 'Bác sĩ',
    name: raw.name || raw.fullName || raw.displayName || 'Bác sĩ',
    title: raw.title || raw.academicRank || 'Bác sĩ',
    specialty_name: raw.specialtyName || raw.specialty_name || specialty.name || 'Đa khoa',
    specialty: raw.specialty || raw.specialtyName || specialty.name || 'Đa khoa',
    specialtyId: raw.specialtyID || raw.specialtyId || specialty.id,
    consultation_fee: Number(raw.consultationFee ?? raw.consultation_fee ?? 0),
    price: Number(raw.consultationFee ?? raw.price ?? 0),
    onlineConsultationFee: Number(
      raw.onlineConsultationFee ?? raw.consultationFee ?? raw.consultation_fee ?? 0
    ),
    rating: Number(raw.ratingAverage ?? raw.rating ?? 5),
    experience_years: raw.experienceYears ?? raw.experience_years ?? 0,
    avatar: resolveDoctorAvatarUrl(raw.avatarUrl || raw.avatar || raw.image),
  }
}

export const bookingService = {
  async getBookingMethods(branchId?: string): Promise<BookingMethod[]> {
    const response = await api.get('/api/v1/schedules/booking-methods', {
      params: branchId ? { branchId } : undefined,
    })
    const methods = unwrapNestResponse<BookingMethod[]>(response.data)
    if (!Array.isArray(methods)) throw new Error('Dữ liệu phương thức đặt lịch không hợp lệ.')
    return methods
  },

  async getBookingInit(params: {
    flow?: BookingFlow
    branchId?: string
    specialtyId?: string | number
  } = {}): Promise<BookingInitResponse> {
    const response = await api.get('/api/v1/booking/init', {
      params: {
        ...(params.flow ? { flow: params.flow } : {}),
        ...(params.branchId ? { branchId: params.branchId } : {}),
        ...(params.specialtyId ? { specialtyId: params.specialtyId } : {}),
      },
    })
    const data = unwrapNestResponse<any>(response.data) || {}
    return {
      ...data,
      branches: Array.isArray(data.branches) ? data.branches : [],
      specialties: Array.isArray(data.specialties) ? data.specialties : [],
      doctors: Array.isArray(data.doctors) ? data.doctors.map(normalizeDoctor) : [],
      services: Array.isArray(data.services) ? data.services : [],
      healthPackages: Array.isArray(data.healthPackages) ? data.healthPackages : [],
    }
  },

  async getBookingSlots(params: {
    bookingMethodCode?: string
    branchId?: string
    specialtyId?: string | number
    doctorId?: string | number
    servicePackageId?: string | number
    date?: string
    days?: number
  } = {}): Promise<BookingSlotsResponse> {
    const response = await api.get('/api/v1/booking/slots', {
      params: Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== undefined && value !== '')
      ),
    })
    const data = unwrapNestResponse<any>(response.data) || {}
    return {
      date: data.date || null,
      availableDates: Array.isArray(data.availableDates) ? data.availableDates : [],
      totalAvailableSlots: Number(data.totalAvailableSlots || 0),
      summary: data.summary || { morning: 0, afternoon: 0, evening: 0 },
      slots: Array.isArray(data.slots) ? data.slots : [],
    }
  },
}
