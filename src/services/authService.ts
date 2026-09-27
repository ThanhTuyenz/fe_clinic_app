import { api } from './api'
import { User } from '../types/user'

export const authService = {
  async login(payload: { email: string; password: string }) {
    const res = await api.post('/api/v1/auth/login', payload)
    return res.data as { token: string; user: User; message?: string }
  },

  async startRegister(payload: { email: string }) {
    const res = await api.post('/api/v1/auth/start-register', payload)
    return res.data as { message?: string; verificationToken?: string }
  },

  async verifyEmail(payload: { verificationToken: string; otp: string }) {
    const res = await api.post('/api/v1/auth/verify-email', payload)
    return res.data as { message?: string; completeToken?: string }
  },

  async completeRegister(payload: {
    completeToken: string
    firstName: string
    lastName: string
    phone: string
    password: string
  }) {
    const res = await api.post('/api/v1/auth/complete-register', payload)
    return res.data as { message?: string; token?: string; user?: User }
  },

  async resendOtp(payload: { email: string }) {
    const res = await api.post('/api/v1/auth/resend-otp', payload)
    return res.data as { message?: string; verificationToken?: string }
  },

  async getMe() {
    const res = await api.get('/api/v1/auth/me')
    return res.data as { user: User }
  },

  async updateMe(payload: Partial<User>) {
    const res = await api.patch('/api/v1/auth/me', payload)
    return res.data as { user: User; message?: string }
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    const res = await api.post('/api/v1/auth/change-password', payload)
    return res.data as { message?: string }
  },

  async startForgotPassword(payload: { email: string }) {
    const res = await api.post('/api/v1/auth/forgot-password', payload)
    return res.data as { message?: string; verificationToken?: string }
  },

  async resetPassword(payload: { verificationToken: string; otp: string; newPassword: string }) {
    const res = await api.post('/api/v1/auth/reset-password', payload)
    return res.data as { message?: string }
  },
}
