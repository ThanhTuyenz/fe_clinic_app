import { Linking, Platform } from 'react-native'
import { api, unwrapNestResponse } from './api'
import { resolveApiBaseUrl } from '../constants/config'
import { User } from '../types/user'

export interface LoginPayload {
  email: string // Chấp nhận email hoặc số điện thoại (VD: 0946135382 hoặc user@example.com)
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string // Email hoặc số điện thoại
  phoneNumber?: string
  password: string
}

export interface VerifyOtpPayload {
  email: string
  otp: string
}

export const authService = {
  /**
   * Đăng nhập bằng Email hoặc Số điện thoại
   */
  async login(payload: LoginPayload) {
    const res = await api.post('/api/v1/auth/login', payload)
    const data = unwrapNestResponse<any>(res.data)
    const result = data || res.data
    return {
      token: (result.token || result.accessToken) as string,
      refreshToken: result.refreshToken as string | undefined,
      tokenExpires: result.tokenExpires as number | undefined,
      user: result.user as User,
      message: result.message as string | undefined,
    }
  },

  /**
   * Đăng ký tài khoản người bệnh
   * - Nếu đăng ký bằng Số điện thoại: Backend kích hoạt trực tiếp không cần OTP
   * - Nếu đăng ký bằng Email: Backend gửi mã OTP qua Gmail
   */
  async register(payload: RegisterPayload) {
    const res = await api.post('/api/v1/auth/register', payload)
    return res.data
  },

  /**
   * Xác thực mã OTP đăng ký (khi đăng ký bằng email)
   */
  async verifyOtp(payload: VerifyOtpPayload) {
    const res = await api.post('/api/v1/auth/verify-otp', payload)
    return res.data
  },

  /**
   * Gửi lại mã OTP
   */
  async resendOtp(payload: { email: string }) {
    const res = await api.post('/api/v1/auth/resend-otp', payload)
    return res.data
  },

  /**
   * Lấy thông tin tài khoản hiện tại từ token
   */
  async getMe(token?: string) {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    const res = await api.get('/api/v1/auth/status', { headers })
    const data = unwrapNestResponse<any>(res.data)
    const result = data || res.data
    return (result?.user ? result : { user: result }) as { user: User }
  },

  /**
   * Quên mật khẩu - gửi email đặt lại
   */
  async forgotPassword(payload: { email: string }) {
    const res = await api.post('/api/v1/auth/forgot-password', payload)
    return res.data
  },

  /**
   * Đặt lại mật khẩu với hash/token
   */
  async resetPassword(payload: { hash: string; password: string }) {
    const res = await api.post('/api/v1/auth/reset-password', payload)
    return res.data
  },

  /**
   * Đăng nhập bằng Zalo SDK
   */
  async loginWithZalo(payload: {
    accessToken: string
    phoneNumber?: string
    name?: string
    email?: string
    avatarUrl?: string
  }) {
    const res = await api.post('/api/v1/auth/zalo', payload)
    const data = unwrapNestResponse<any>(res.data)
    const result = data || res.data
    return {
      token: (result.token || result.accessToken) as string,
      refreshToken: result.refreshToken as string | undefined,
      tokenExpires: result.tokenExpires as number | undefined,
      user: result.user as User,
      message: result.message as string | undefined,
    }
  },

  /**
   * Đăng nhập bằng Google qua luồng OAuth chuẩn
   */
  loginWithGoogle() {
    const baseUrl = resolveApiBaseUrl().replace(/\/$/, '')
    const origin =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:8081'

    const authUrl = `${baseUrl}/api/v1/auth/google?state=${encodeURIComponent(origin)}`
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = authUrl
    } else {
      Linking.openURL(authUrl).catch((e) => console.warn('Lỗi mở Google OAuth:', e))
    }
  },

  /**
   * Kiểm tra SĐT có thuộc tài khoản Zalo để gợi ý liên kết email
   */
  async checkPhoneLink(phoneNumber: string): Promise<{
    exists: boolean
    isZaloAccount: boolean
    fullName?: string | null
    email?: string | null
  }> {
    const res = await api.post('/api/v1/auth/check-phone-link', { phoneNumber })
    const data = unwrapNestResponse<any>(res.data)
    return data || res.data
  },

  /**
   * Yêu cầu gửi OTP qua Zalo ZNS để xác thực liên kết email
   */
  async requestLinkOtp(phoneNumber: string): Promise<{
    message: string
    expiresIn: number
  }> {
    const res = await api.post('/api/v1/auth/request-link-otp', { phoneNumber })
    const data = unwrapNestResponse<any>(res.data)
    return data || res.data
  },

  /**
   * Xác nhận liên kết Email & Mật khẩu vào tài khoản Zalo bằng OTP
   */
  async confirmLinkAccount(payload: {
    phoneNumber: string
    email: string
    password?: string
    fullName?: string
    otp: string
  }) {
    const res = await api.post('/api/v1/auth/confirm-link-account', payload)
    const data = unwrapNestResponse<any>(res.data)
    const result = data || res.data
    return {
      token: (result.token || result.accessToken) as string,
      refreshToken: result.refreshToken as string | undefined,
      tokenExpires: result.tokenExpires as number | undefined,
      user: result.user as User,
      message: result.message as string | undefined,
    }
  },
}
