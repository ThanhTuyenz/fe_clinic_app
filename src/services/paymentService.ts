import { api, unwrapNestResponse } from './api'
import { PayosPaymentInfo } from '../utils/vietqrDeepLink'

export interface PayosCreatePaymentResponse extends PayosPaymentInfo {
  holdExpiresAt: string
  orderCode: number
  paymentId?: string
  status?: string
}

export const paymentService = {
  /**
   * Khởi tạo giao dịch thanh toán PayOS (VietQR) cho lịch hẹn
   */
  async createPayosPayment(payload: {
    appointmentId: string
    amount: number
    description?: string
  }): Promise<PayosCreatePaymentResponse> {
    const res = await api.post('/api/v1/payments/create', payload)
    return unwrapNestResponse<PayosCreatePaymentResponse>(res.data)
  },

  /**
   * Kiểm tra trạng thái thanh toán của lịch hẹn
   */
  async checkPaymentStatus(appointmentId: string): Promise<{
    appointmentId: string
    status: string
    invoiceStatus?: string
    isPaid: boolean
    paidAt?: string
  }> {
    const res = await api.get(`/api/v1/appointments/${appointmentId}/payment-status`)
    const data = unwrapNestResponse<any>(res.data)
    const isPaid =
      data?.status === 'PAID' ||
      data?.status === 'CONFIRMED' ||
      data?.status === 'CHECKED_IN' ||
      data?.status === 'COMPLETED' ||
      data?.invoiceStatus === 'PAID' ||
      data?.paymentStatus === 'SUCCESS' ||
      data?.isPaid === true

    return {
      appointmentId,
      status: data?.status || 'PENDING',
      invoiceStatus: data?.invoiceStatus,
      isPaid,
      paidAt: data?.paidAt,
    }
  },

  /** Reconcile a delayed webhook, then confirm the result from our backend. */
  async refreshPaymentStatus(appointmentId: string) {
    const current = await paymentService.checkPaymentStatus(appointmentId)
    if (current.isPaid) return current
    let syncError: unknown
    try {
      await paymentService.syncPayment(appointmentId)
    } catch (error) {
      syncError = error
    }
    const confirmed = await paymentService.checkPaymentStatus(appointmentId)
    if (!confirmed.isPaid && syncError) throw syncError
    return confirmed
  },

  /**
   * Đồng bộ chủ động kết quả thanh toán từ cổng PayOS Gateway
   */
  async syncPayment(appointmentId: string, orderCode?: number | string): Promise<any> {
    const res = await api.post('/api/v1/payments/sync', {
      appointmentId,
      orderCode,
    })
    return unwrapNestResponse<any>(res.data)
  },

  /**
   * Giả lập thanh toán thành công (dành cho demo/kiểm thử)
   */
  async simulateSuccess(paymentId: string): Promise<any> {
    const res = await api.post('/api/v1/payments/simulate-success', { paymentId })
    return unwrapNestResponse<any>(res.data)
  },
}
