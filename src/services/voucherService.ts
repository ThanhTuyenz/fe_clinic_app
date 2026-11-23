import { api, unwrapNestResponse } from './api'

export interface Voucher {
  id: string
  code: string
  name: string
  description?: string
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
  discountValue: number
  maxDiscount?: number | null
  minOrderValue?: number | null
  startDate?: string
  endDate?: string
  isActive?: boolean
}

export interface VoucherCalculationResult {
  valid: boolean
  subtotal: number
  discountAmount: number
  finalTotal: number
  voucher: {
    id: string
    code: string
    name: string
    description?: string
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT'
    discountValue: number
    maxDiscount: number | null
    minOrderValue: number | null
  }
  message: string
}

export const voucherService = {
  async getAvailableVouchers(): Promise<Voucher[]> {
    try {
      const res = await api.get('/api/v1/vouchers/available')
      const data = unwrapNestResponse<Voucher[]>(res.data)
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  },

  async validateVoucher(code: string, subtotal: number): Promise<VoucherCalculationResult> {
    const res = await api.post('/api/v1/vouchers/validate', {
      code: code.trim().toUpperCase(),
      subtotal,
    })
    return unwrapNestResponse<VoucherCalculationResult>(res.data)
  },
}
