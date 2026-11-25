import { Platform } from 'react-native'
import { isAxiosError } from 'axios'
import { api, unwrapNestResponse } from './api'
import { resolveApiBaseUrl } from '../constants/config'
import { User } from '../types/user'
import { getGoogleIdToken } from '../utils/googleSignIn'
import { createGoogleLoginStep, type GoogleLoginStep } from '../utils/googleLoginProgress'

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

/**
 * Mật khẩu phải có từ 6 đến 24 ký tự.
 */
function validatePassword(
  password: string,
  message = 'Mật khẩu phải có từ 6 đến 24 ký tự.'
): void {
  if (typeof password !== 'string' || password.length < 6 || password.length > 24) {
    throw new Error(message)
  }
}

const LOGIN_ERROR_MESSAGE = 'Email hoặc mật khẩu không chính xác'

export const authService = {
  /**
   * Đăng nhập bằng Email hoặc Số điện thoại
   */
  async login(payload: LoginPayload) {
    validatePassword(payload.password, LOGIN_ERROR_MESSAGE)

    try {
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
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response) {
        const { status, data } = error.response
        let invalidCredentials = status === 401

        // Một số backend trả lỗi thông tin đăng nhập bằng mã 400 hoặc 422.
        // Chỉ đổi thông báo khi có mã lỗi xác định email/mật khẩu không đúng.
        if (status === 400 || status === 422) {
          const details = unwrapNestResponse<any>(data) || data
          invalidCredentials =
            details?.code === 'INVALID_CREDENTIALS' ||
            details?.errors?.email === 'notFound' ||
            details?.errors?.password === 'incorrectPassword'
        }

        if (invalidCredentials) {
          error.message = LOGIN_ERROR_MESSAGE
          error.response.data = {
            ...(data && typeof data === 'object' && !Array.isArray(data) ? data : {}),
            message: LOGIN_ERROR_MESSAGE,
          }
        }
      }

      throw error
    }
  },

  /**
   * Đăng ký tài khoản người bệnh
   * - Nếu đăng ký bằng Số điện thoại: Backend kích hoạt trực tiếp không cần OTP
   * - Nếu đăng ký bằng Email: Backend gửi mã OTP qua Gmail
   */
  async register(payload: RegisterPayload) {
    validatePassword(payload.password)

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
    validatePassword(payload.password)

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
   * Native: chọn tài khoản Google và đổi ID Token lấy phiên đăng nhập VitaCare.
   * Web: giữ luồng OAuth redirect.
   */
  async loginWithGoogle(step: GoogleLoginStep = createGoogleLoginStep()) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const baseUrl = resolveApiBaseUrl().replace(/\/+$/, '')
      const authUrl = `${baseUrl}/api/v1/auth/google?state=${encodeURIComponent(window.location.origin)}`
      window.location.href = authUrl
      return null
    }
    const idToken = await getGoogleIdToken(step)
    if (!idToken) return null
    // Axios omits a header set to false. This exchange must not validate an old VitaCare session.
    const res = await step('backend', () => api.post('/api/v1/auth/google', { idToken }, {
      headers: { Authorization: false },
    }))
    if (typeof __DEV__ !== 'undefined' && __DEV__ && res.headers?.['server-timing']) {
      console.info(`[GoogleLogin] server: ${res.headers['server-timing']}`)
    }
    const result = unwrapNestResponse<any>(res.data) || res.data
    return {
      token: (result.token || result.accessToken) as string,
      refreshToken: result.refreshToken as string | undefined,
      user: result.user as User,
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
    if (payload.password !== undefined) {
      validatePassword(payload.password)
    }

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
