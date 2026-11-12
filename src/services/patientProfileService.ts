import { api, unwrapNestResponse } from './api'
import { normalizeBirthDate } from '../utils/date'

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
    const res = await api.get('/api/v1/patient-profiles')
    const data = unwrapNestResponse<PatientProfile[]>(res.data)
    if (!Array.isArray(data)) throw new Error('Không thể tải danh sách hồ sơ bệnh nhân.')
    return data
  },

  async createPatientProfile(payload: CreatePatientProfilePayload): Promise<PatientProfile> {
    const dateOfBirth = normalizeBirthDate(payload.dateOfBirth)
    if (!dateOfBirth) throw new Error('Ngày sinh không hợp lệ. Vui lòng chọn lại ngày sinh.')
    const res = await api.post('/api/v1/patient-profiles', { ...payload, dateOfBirth })
    return unwrapNestResponse<PatientProfile>(res.data)
  },

  async updatePatientProfile(id: string, payload: Partial<CreatePatientProfilePayload>): Promise<PatientProfile> {
    const dateOfBirth = payload.dateOfBirth !== undefined ? normalizeBirthDate(payload.dateOfBirth) : undefined
    if (dateOfBirth === null) throw new Error('Ngày sinh không hợp lệ. Vui lòng chọn lại ngày sinh.')
    const res = await api.patch(`/api/v1/patient-profiles/${id}`, {
      ...payload, ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
    })
    return unwrapNestResponse<PatientProfile>(res.data)
  },

  async getMedicalRecords(patientProfileId: string): Promise<any> {
    const res = await api.get(`/api/v1/patient-profiles/${patientProfileId}/medical-records`)
    const data = unwrapNestResponse<any>(res.data)
    return data?.medicalRecord || data
  },
}
