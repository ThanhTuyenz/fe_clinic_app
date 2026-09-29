import { api, unwrapNestResponse } from './api'

export interface PatientProfile {
  id: string
  fullName: string
  dateOfBirth?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | string
  phoneNumber?: string
  identityCardNumber?: string
  nationalId?: string
  healthInsuranceNumber?: string
  relationshipToAccount?: 'SELF' | 'SPOUSE' | 'CHILD' | 'PARENT' | 'OTHER' | string
  address?: string
  streetAddress?: string
  wardName?: string
  districtName?: string
  provinceName?: string
  isMainProfile?: boolean
}

export interface CreatePatientProfilePayload {
  fullName: string
  dateOfBirth: string // YYYY-MM-DD
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  phoneNumber?: string
  nationalId?: string
  healthInsuranceNumber?: string
  relationshipToAccount?: string
  isMainProfile?: boolean
  address?: string
}

export const patientProfileService = {
  async getPatientProfiles(): Promise<PatientProfile[]> {
    try {
      const res = await api.get('/api/v1/patient-profiles')
      const data = unwrapNestResponse<PatientProfile[]>(res.data)
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },

  async createPatientProfile(payload: CreatePatientProfilePayload): Promise<PatientProfile> {
    const res = await api.post('/api/v1/patient-profiles', payload)
    return unwrapNestResponse<PatientProfile>(res.data)
  },

  async updatePatientProfile(id: string, payload: Partial<CreatePatientProfilePayload>): Promise<PatientProfile> {
    const res = await api.patch(`/api/v1/patient-profiles/${id}`, payload)
    return unwrapNestResponse<PatientProfile>(res.data)
  },

  async getOrCreateMainProfile(fallbackUser: {
    fullName?: string
    full_name?: string
    phone?: string
    date_of_birth?: string
    gender?: string
  }): Promise<PatientProfile> {
    const existing = await this.getPatientProfiles()
    if (existing.length > 0) {
      const main = existing.find((p) => p.isMainProfile || p.relationshipToAccount === 'SELF')
      return main || existing[0]
    }

    const name = fallbackUser.fullName || fallbackUser.full_name || 'Bệnh nhân'
    const dob = fallbackUser.date_of_birth || '2000-01-01'
    const gender = (fallbackUser.gender || '').toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE'

    return await this.createPatientProfile({
      fullName: name,
      dateOfBirth: dob.includes('T') ? dob.slice(0, 10) : dob,
      gender,
      phoneNumber: fallbackUser.phone || '',
      relationshipToAccount: 'SELF',
      isMainProfile: true,
    })
  },

  async getMedicalRecords(patientProfileId: string): Promise<any[]> {
    try {
      const res = await api.get(`/api/v1/patient-profiles/${patientProfileId}/medical-records`)
      const data = unwrapNestResponse<any[]>(res.data)
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },
}
