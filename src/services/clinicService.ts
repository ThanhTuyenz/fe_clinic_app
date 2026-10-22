import { api, unwrapNestResponse } from './api'
export interface HomePackage {
  id: string
  name: string
  price: number
  slug?: string
  specialty?: { name?: string }
  specialtyName?: string
  category?: string
  description?: string
  desc?: string
  imageUrl?: string
  image?: string
  tag?: string
}
export interface ClinicHomepage {
  branches: { id: string; name: string; address?: string; phoneNumber?: string; latitude?: number; longitude?: number }[]
  stats: { doctorCount: number; specialtyCount: number; branchCount: number; averageRating?: number }
  healthPackages: HomePackage[]
  specialtyPackages: HomePackage[]
}
export const clinicService = {
  async homepage(): Promise<ClinicHomepage> {
    const res = await api.get('/api/v1/public/homepage')
    const data = unwrapNestResponse<ClinicHomepage>(res.data)
    if (!data || !Array.isArray(data.branches) || !Array.isArray(data.healthPackages) || !Array.isArray(data.specialtyPackages)) throw new Error('Không thể tải thông tin phòng khám.')
    return data
  },
}
