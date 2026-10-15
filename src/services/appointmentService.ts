import { api, unwrapNestResponse } from './api'
import { Appointment, CheckInPass } from '../types/appointment'

export interface CheckoutPayload {
  searchId?: string
  sourceViewId?: string
  analyticsSessionId?: string
  bookingMethodCode: string
  patientProfileId: string
  scheduleSlotId: string
  servicePackageId?: string
  symptomsDescription?: string
  voucherCode?: string
}

export interface CheckoutResult {
  appointmentId: string
  invoiceId: string
  paymentId: string
  status: string
  holdStartedAt: string
  holdExpiresAt: string
  subtotal?: number
  serviceFee?: number
  discountAmount?: number
  totalAmount?: number
}

export const appointmentService = {
  async getMyAppointments(): Promise<Appointment[]> {
    try {
      const res = await api.get('/api/v1/appointments/my-bookings')
      const data = unwrapNestResponse<any>(res.data)
      const list = Array.isArray(data) ? data : data?.appointments || []
      return list.map((item: any) => ({
        ...item,
        id: String(item.id),
        appointment_date: item.appointmentDate || item.appointment_date,
        startTime: item.startTime || item.slot || '08:00',
        code: item.bookingCode || item.code,
      }))
    } catch {
      return []
    }
  },

  async getCheckInPass(id: string | number): Promise<CheckInPass | null> {
    try {
      const res = await api.get(`/api/v1/appointments/${id}/check-in-pass`)
      return unwrapNestResponse<CheckInPass>(res.data)
    } catch {
      return null
    }
  },

  async getPaymentStatus(id: string | number): Promise<any> {
    try {
      const res = await api.get(`/api/v1/appointments/${id}/payment-status`)
      return unwrapNestResponse<any>(res.data)
    } catch {
      return null
    }
  },

  async getAppointmentById(id: string | number): Promise<Appointment | null> {
    // 1. Thử lấy check-in pass (khi lịch đã CONFIRMED / CHECKED_IN)
    const pass = await this.getCheckInPass(id)
    if (pass) {
      return {
        id: pass.appointmentId,
        code: pass.bookingCode,
        bookingCode: pass.bookingCode,
        status: pass.status,
        isTelehealth: pass.isTelehealth,
        bookingMethod: pass.bookingMethod,
        queueNumber: pass.queueNumber || pass.estimatedQueueNumber,
        appointment_date: pass.appointmentDate,
        appointmentDate: pass.appointmentDate,
        startTime: pass.startTime,
        endTime: pass.endTime,
        doctor: pass.doctor,
        healthPackage: pass.healthPackage,
        specialty: pass.specialty,
        branch: pass.branch,
        room: pass.room,
        totalAmount: pass.totalAmount,
        qrPayload: pass.qrPayload ?? undefined,
      } as Appointment
    }

    // 2. Thử tìm trong myAppointments
    const all = await this.getMyAppointments()
    const found = all.find((a) => String(a.id) === String(id))
    if (found) return found

    // 3. Thử qua payment status
    const payStatus = await this.getPaymentStatus(id)
    if (payStatus) {
      return {
        id: payStatus.appointmentId || String(id),
        code: payStatus.bookingCode,
        bookingCode: payStatus.bookingCode,
        status: payStatus.status,
        isTelehealth: payStatus.isTelehealth,
        bookingMethod: payStatus.bookingMethod,
        queueNumber: payStatus.queueNumber || payStatus.estimatedQueueNumber,
        branch: payStatus.branch,
        room: payStatus.room,
      } as Appointment
    }

    return null
  },

  async checkout(payload: CheckoutPayload): Promise<CheckoutResult> {
    const res = await api.post('/api/v1/appointments/checkout', payload)
    return unwrapNestResponse<CheckoutResult>(res.data)
  },

  async cancelAppointment(id: string | number, reason?: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/api/v1/appointments/${id}/cancel`, {
      reason: reason || 'Bệnh nhân bận việc đột xuất',
    })
    return unwrapNestResponse<{ success: boolean; message: string }>(res.data)
  },
}
