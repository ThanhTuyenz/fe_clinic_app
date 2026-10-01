import { api, unwrapNestResponse } from './api'
import { Department, Doctor, Specialty } from '../types/doctor'
import { TimeSlot } from '../types/appointment'
import { resolveApiBaseUrl } from '../constants/config'

const DEFAULT_DOCTOR_AVATAR =
  'https://sf-static.upanhlaylink.com/img/image_202603269925437b540c48178c53b73c88dd8146.jpg'

export function resolveDoctorAvatarUrl(rawUrl?: string): string {
  if (!rawUrl || !String(rawUrl).trim()) return DEFAULT_DOCTOR_AVATAR
  const trimmed = String(rawUrl).trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  const base = resolveApiBaseUrl()
  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return `${base}${path}`
}

export const doctorService = {
  async getDoctors(branchId?: string, specialtyId?: number, q?: string): Promise<Doctor[]> {
    const res = await api.get('/api/v1/doctors', {
      params: {
        ...(branchId ? { branchId } : {}),
        ...(specialtyId ? { specialtyId } : {}),
        ...(q ? { q } : {}),
      },
    })
    const rows = unwrapNestResponse<any[]>(res.data) || []
    return (Array.isArray(rows) ? rows : []).map((d: any) => {
      const primarySpecialty = d.specialties?.[0]?.specialty || d.specialty
      const branchIdFound = d.user?.branchAssignments?.[0]?.branch?.id || d.branchId || branchId
      return {
        ...d,
        id: d.id || d._id,
        branchId: branchIdFound,
        specialtyId: primarySpecialty?.id || d.specialties?.[0]?.specialtyId || d.specialtyId || d.specialtyID,
        fullName: d.fullName || d.user?.fullName || d.name,
        name: d.name || d.fullName || d.user?.fullName,
        title: d.academicRank || d.title,
        specialty_name: primarySpecialty?.name || d.specialty_name || 'Đa khoa',
        specialty: primarySpecialty?.name || d.specialty || 'Đa khoa',
        department: primarySpecialty?.name || d.department || 'Đa khoa',
        consultation_fee: Number(d.consultationFee ?? d.consultation_fee ?? 0),
        price: Number(d.consultationFee ?? d.price ?? 0),
        rating: d.ratingAverage ?? d.rating ?? 5.0,
        experience_years: d.experienceYears ?? d.experience_years ?? 0,
        bio: d.biography || d.bio,
        avatar: resolveDoctorAvatarUrl(d.avatarUrl || d.avatar || d.image || d.profileImage),
      }
    })
  },

  async getDoctorById(id: string | number): Promise<Doctor | null> {
    try {
      const doctors = await this.getDoctors()
      const found = doctors.find((d) => String(d.id) === String(id))
      return found || null
    } catch {
      return null
    }
  },

  async getBranches(): Promise<any[]> {
    try {
      const res = await api.get('/api/v1/branches')
      const rows = unwrapNestResponse<any[]>(res.data)
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  },

  async getSpecialties(): Promise<Specialty[]> {
    try {
      const res = await api.get('/api/v1/specialties')
      const rows = unwrapNestResponse<Specialty[]>(res.data)
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  },

  async getDepartments(): Promise<Department[]> {
    return this.getSpecialties() as Promise<Department[]>
  },

  async getHealthPackages(branchId?: string): Promise<any[]> {
    try {
      const res = await api.get('/api/v1/services/packages/health', {
        params: branchId ? { branchId } : undefined,
      })
      const rows = unwrapNestResponse<any[]>(res.data)
      return Array.isArray(rows) ? rows : []
    } catch (err) {
      console.warn('Could not fetch health packages', err)
      return []
    }
  },

  async getSpecialtyPackages(branchId?: string): Promise<any[]> {
    try {
      const res = await api.get('/api/v1/services/packages/specialty', {
        params: branchId ? { branchId } : undefined,
      })
      const rows = unwrapNestResponse<any[]>(res.data)
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  },

  async getSpecialtyServices(specialtyId: number | string, branchId?: string): Promise<any[]> {
    try {
      const res = await api.get('/api/v1/specialties/services', {
        params: {
          specialtyId: Number(specialtyId),
          ...(branchId ? { branchId } : {}),
        },
      })
      const rows = unwrapNestResponse<any[]>(res.data)
      if (Array.isArray(rows) && rows.length > 0) return rows
      const fallbackRes = await api.get(`/api/v1/specialties/${specialtyId}/services`, {
        params: branchId ? { branchId } : undefined,
      })
      const fallbackRows = unwrapNestResponse<any[]>(fallbackRes.data)
      return Array.isArray(fallbackRows) ? fallbackRows : []
    } catch {
      return []
    }
  },

  async getDoctorAvailableDates(doctorId: string, branchId?: string): Promise<string[]> {
    try {
      const res = await api.get(`/api/v1/doctors/${doctorId}/available-dates`, {
        params: branchId ? { branchId } : undefined,
      })
      const rows = unwrapNestResponse<string[]>(res.data)
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  },

  async getDoctorTimeslots(doctorId: string, branchId: string, date: string): Promise<TimeSlot[]> {
    try {
      const res = await api.get(`/api/v1/doctors/${doctorId}/timeslots`, {
        params: { branchId, date },
      })
      const rows = unwrapNestResponse<TimeSlot[]>(res.data)
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  },

  async getAvailability(doctorId: string | number, date: string, branchId?: string): Promise<TimeSlot[]> {
    try {
      let bId = branchId
      if (!bId) {
        const branches = await this.getBranches().catch(() => [])
        bId = branches[0]?.id
      }
      return await this.getDoctorTimeslots(String(doctorId), bId || '', date)
    } catch {
      return []
    }
  },

  async getPackageScheduleDates(packageId: string, branchId?: string): Promise<string[]> {
    try {
      const res = await api.get('/api/v1/services/schedule-dates', {
        params: { packageId, branchId },
      })
      const rows = unwrapNestResponse<string[]>(res.data)
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  },

  async getPackageTimeslots(packageId: string, date: string, branchId?: string): Promise<TimeSlot[]> {
    try {
      const res = await api.get('/api/v1/services/timeslots', {
        params: { packageId, date, branchId },
      })
      const rows = unwrapNestResponse<TimeSlot[]>(res.data)
      return Array.isArray(rows) ? rows : []
    } catch {
      return []
    }
  },

  async getBookingMethods(branchId?: string): Promise<any[]> {
    try {
      let targetBranchId = branchId
      if (!targetBranchId) {
        const branches = await this.getBranches().catch(() => [])
        const activeBranch = branches.find((b: any) => b.code === 'VC-CENTRAL') || branches[0]
        targetBranchId = activeBranch?.id
      }

      const res = await api.get('/api/v1/schedules/booking-methods', {
        params: targetBranchId ? { branchId: targetBranchId } : undefined,
      })
      const rows = unwrapNestResponse<any[]>(res.data)
      if (Array.isArray(rows) && rows.length > 0) {
        return rows
      }
    } catch (err) {
      console.warn('Could not fetch booking methods from backend', err)
    }
    return []
  },

  async getBookingSlots(params: {
    branchId?: string
    specialtyId?: number | string
    doctorId?: string
    date?: string
    days?: number
  } = {}): Promise<{
    date: string | null
    availableDates: string[]
    totalAvailableSlots: number
    summary: {
      morning: number
      afternoon: number
      evening: number
    }
    slots: Array<{
      startTime: string
      endTime: string
      label: string
      period: 'MORNING' | 'AFTERNOON' | 'EVENING'
      totalCapacity: number
      occupiedCount: number
      remainingSlots: number
      isFull: boolean
      representativeSlotId: string
      doctors: Array<{
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
      }>
    }>
  }> {
    try {
      const res = await api.get('/api/v1/booking/slots', {
        params: {
          ...(params.branchId ? { branchId: params.branchId } : {}),
          ...(params.specialtyId ? { specialtyId: params.specialtyId } : {}),
          ...(params.doctorId ? { doctorId: params.doctorId } : {}),
          ...(params.date ? { date: params.date } : {}),
          ...(params.days ? { days: params.days } : {}),
        },
      })
      const data = unwrapNestResponse<any>(res.data)
      return {
        date: data?.date || null,
        availableDates: Array.isArray(data?.availableDates) ? data.availableDates : [],
        totalAvailableSlots: data?.totalAvailableSlots || 0,
        summary: data?.summary || { morning: 0, afternoon: 0, evening: 0 },
        slots: Array.isArray(data?.slots) ? data.slots : [],
      }
    } catch (err) {
      console.warn('Could not fetch booking slots', err)
      return {
        date: null,
        availableDates: [],
        totalAvailableSlots: 0,
        summary: { morning: 0, afternoon: 0, evening: 0 },
        slots: [],
      }
    }
  },
}
