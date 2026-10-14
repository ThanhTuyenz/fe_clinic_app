import { api, unwrapNestResponse } from './api'
import { Department, Doctor, Specialty } from '../types/doctor'
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
        onlineConsultationFee: Number(
          d.onlineConsultationFee ??
            d.online_consultation_fee ??
            d.consultationFee ??
            d.consultation_fee ??
            0
        ),
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
      const unwrapped = unwrapNestResponse<any>(res.data)
      if (Array.isArray(unwrapped)) return unwrapped
      if (Array.isArray(unwrapped?.data)) return unwrapped.data
      return []
    } catch (err) {
      console.warn('Could not fetch health packages', err)
      return []
    }
  },

  async getAllPackages(params?: {
    branchId?: string
    specialtyId?: number
    search?: string
    limit?: number
    type?: 'all' | 'health-package' | 'specialty'
    needPagination?: boolean
  }): Promise<any[]> {
    try {
      const res = await api.get('/api/v1/public/packages', {
        params: {
          limit: params?.limit || 200,
          type: params?.type || 'all',
          needPagination: params?.needPagination ?? false,
          ...(params?.branchId ? { branchId: params.branchId } : {}),
          ...(params?.specialtyId ? { specialtyId: params.specialtyId } : {}),
          ...(params?.search ? { search: params.search } : {}),
        },
      })
      const unwrapped = unwrapNestResponse<any>(res.data)
      if (Array.isArray(unwrapped)) return unwrapped
      if (Array.isArray(unwrapped?.data)) return unwrapped.data
      return []
    } catch (err) {
      console.warn('Could not fetch all packages', err)
      return []
    }
  },

  async getPackageDetail(idOrSlug: string): Promise<any> {
    try {
      const res = await api.get(`/api/v1/services/${idOrSlug}`)
      const data = unwrapNestResponse<any>(res.data)
      if (data && data.id) return data
    } catch {
      // ignore
    }

    try {
      const pkgs = await this.getAllPackages()
      const found = pkgs.find((p) => String(p.id) === String(idOrSlug) || p.slug === idOrSlug)
      if (found) return found
    } catch {
      // ignore
    }

    return null
  },

  async getSpecialtyPackages(branchId?: string): Promise<any[]> {
    try {
      const res = await api.get('/api/v1/services/packages/specialty', {
        params: branchId ? { branchId } : undefined,
      })
      const unwrapped = unwrapNestResponse<any>(res.data)
      if (Array.isArray(unwrapped)) return unwrapped
      if (Array.isArray(unwrapped?.data)) return unwrapped.data
      return []
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

}
