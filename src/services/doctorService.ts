import { api } from './api'
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
  async getDoctors(): Promise<Doctor[]> {
    const res = await api.get('/api/v1/doctors')
    const raw = res.data?.doctors || []
    return raw.map((d: any) => ({
      ...d,
      id: d.id || d._id,
      avatar: resolveDoctorAvatarUrl(d.avatar || d.image || d.profileImage),
    }))
  },

  async getDoctorById(id: string | number): Promise<Doctor> {
    const res = await api.get(`/api/v1/doctors/${id}`)
    const d = res.data?.doctor || res.data
    return {
      ...d,
      id: d.id || d._id,
      avatar: resolveDoctorAvatarUrl(d.avatar || d.image || d.profileImage),
    }
  },

  async getDepartments(): Promise<Department[]> {
    const res = await api.get('/api/v1/departments')
    const raw = res.data?.departments || res.data?.data || res.data || []
    return Array.isArray(raw)
      ? raw.map((item: any) => ({
          ...item,
          id: item.id || item._id,
          name: item.name || item.deptName || 'Khoa khám',
        }))
      : []
  },

  async getSpecialties(): Promise<Specialty[]> {
    const res = await api.get('/api/v1/specialties')
    const raw = res.data?.specialties || res.data || []
    return Array.isArray(raw) ? raw : []
  },

  async getAvailability(doctorId: string | number, date: string): Promise<string[]> {
    const res = await api.get('/api/v1/appointments/availability', {
      params: { doctorId, date },
    })
    const raw = res.data?.slots || res.data?.freeSlots || res.data?.availableSlots || []
    if (!Array.isArray(raw)) return []
    return raw
      .map((slot: any) => (typeof slot === 'string' ? slot : slot?.startTime))
      .map((t: any) => String(t || '').trim().slice(0, 5))
      .filter(Boolean)
      .sort()
  },
}
