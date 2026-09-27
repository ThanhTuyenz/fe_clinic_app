import { api } from './api'
import { Appointment } from '../types/appointment'

export interface CreateAppointmentPayload {
  doctorId: string | number
  appointmentDate: string // YYYY-MM-DD
  startTime: string // HH:mm
  note?: string
  symptoms?: string
  patientType?: 'self' | 'relative'
  patientName?: string
  patientPhone?: string
  patientDob?: string
  patientGender?: string
  medicalRecords?: string[]
}

export const appointmentService = {
  async getMyAppointments(): Promise<Appointment[]> {
    const res = await api.get('/api/v1/appointments/my')
    return (res.data?.appointments || res.data || []) as Appointment[]
  },

  async getAppointmentById(id: string | number): Promise<Appointment> {
    const res = await api.get(`/api/v1/appointments/${id}`)
    return (res.data?.appointment || res.data) as Appointment
  },

  async createAppointment(payload: CreateAppointmentPayload): Promise<{
    appointment: Appointment
    message: string
  }> {
    const res = await api.post('/api/v1/appointments', {
      source: 'online',
      bookingSource: 'online',
      ...payload,
    })
    return res.data
  },

  async cancelAppointment(id: string | number, cancelReason: string): Promise<{ message: string }> {
    const res = await api.patch(`/api/v1/appointments/${id}/cancel`, {
      cancelReason,
    })
    return res.data
  },
}
