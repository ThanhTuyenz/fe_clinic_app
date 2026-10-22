import { isUuid } from '../utils/validation'
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

export interface FamilyCheckoutResult {
  bookingOrderId: string
  paymentId: string
  totalAmount: number
  subtotal: number
  serviceFee: number
  discountAmount: number
  holdExpiresAt: string
  appointments: { appointmentId: string; patientProfileId: string; status: string }[]
}

export const appointmentService = {
  async batchCheckout(items: CheckoutPayload[], voucherCode?: string): Promise<FamilyCheckoutResult> {
    if (!items.length || items.length > 5) throw new Error('Vui lòng chọn từ 1 đến 5 người khám.')
    if (new Set(items.map(item => item.patientProfileId)).size !== items.length) throw new Error('Mỗi người chỉ được chọn một lần.')
    for (const item of items) {
      if (!isUuid(item.patientProfileId) || !isUuid(item.scheduleSlotId) || !isUuid(item.servicePackageId)) throw new Error('Vui lòng chọn đủ hồ sơ, dịch vụ và khung giờ hợp lệ cho từng người.')
    }
    const res = await api.post('/api/v1/bookings/batch-checkout', { items, groupType: 'FAMILY', ...(voucherCode?.trim() ? { voucherCode: voucherCode.trim() } : {}) })
    const result = unwrapNestResponse<FamilyCheckoutResult>(res.data)
    if (!result?.bookingOrderId || !result.appointments?.length) throw new Error('Máy chủ chưa trả về đơn đặt khám gia đình.')
    return result
  },
  async getMyAppointments(): Promise<Appointment[]> {
      const res = await api.get('/api/v1/appointments/my-bookings')
      const data = unwrapNestResponse<any>(res.data)
      const list = Array.isArray(data) ? data : data?.appointments || []
      return list.map((item: any) => ({
        ...item,
        id: String(item.id),
        appointment_date: item.appointmentDate || item.appointment_date,
        startTime: item.startTime || item.slot || null,
        code: item.bookingCode || item.code,
      }))
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
      const res = await api.get(`/api/v1/payments/appointments/${id}/status`)
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
        paymentStatus: pass.paymentStatus,
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
        invoiceStatus: payStatus.invoiceStatus,
        paymentStatus: payStatus.paymentStatus,
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
    if (!isUuid(payload.scheduleSlotId)) {
      throw new Error('Khung giờ không hợp lệ. Vui lòng chọn lại giờ khám.')
    }
    if (!isUuid(payload.patientProfileId)) {
      throw new Error('Hồ sơ không hợp lệ. Vui lòng chọn lại người khám.')
    }
    if (payload.servicePackageId !== undefined && !isUuid(payload.servicePackageId)) {
      throw new Error('Gói khám không hợp lệ. Vui lòng chọn lại dịch vụ khám.')
    }
    const res = await api.post('/api/v1/bookings/checkout', payload)
    return unwrapNestResponse<CheckoutResult>(res.data)
  },

  async cancelAppointment(id: string | number, reason?: string): Promise<{ success: boolean; message: string }> {
    const res = await api.post(`/api/v1/appointments/${id}/cancel`, {
      reason: reason || 'Bệnh nhân bận việc đột xuất',
    })
    return unwrapNestResponse<{ success: boolean; message: string }>(res.data)
  },
}
