import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { resolveApiBaseUrl, STORAGE_KEYS } from '../constants/config'
import { useAuthStore } from '../store/useAuthStore'

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Tự động gắn Bearer Token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      config.baseURL = resolveApiBaseUrl()
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (e) {
      console.warn('Lỗi khi đọc token từ AsyncStorage:', e)
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Trạng thái cho hàng đợi khi đang Refresh Token
let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Response Interceptor: Xử lý lỗi tập trung & Tự động Refresh Token khi gặp 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[]; code?: string; errors?: Record<string, string> }>) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    // 1. Không kết nối được server
    if (!error.response) {
      const currentBase = resolveApiBaseUrl()
      const msg = `Không thể kết nối đến máy chủ (${currentBase}). Vui lòng kiểm tra backend và kết nối mạng.`
      return Promise.reject(new Error(msg))
    }

    const { status, data } = error.response
    const isAuthRoute =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/google') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/register')

    // 2. Xử lý lỗi 401 Unauthorized (Token hết hạn)
    if (status === 401 && originalRequest && !isAuthRoute) {
      if (originalRequest._retry) {
        // Đã thử refresh nhưng vẫn 401 -> Logout
        await useAuthStore.getState().logout()
        return Promise.reject(new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'))
      }

      if (isRefreshing) {
        // Nếu đang trong tiến trình refresh, đẩy request vào hàng đợi
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((newToken) => {
            if (newToken && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const savedRefreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
        if (!savedRefreshToken) {
          throw new Error('Không có refresh token')
        }

        // Gọi raw axios (không qua interceptor) để tránh vòng lặp 401 vô tận
        // resolveApiBaseUrl() trả về host không có /api/v1 → cần prepend đầy đủ
        const currentBase = resolveApiBaseUrl().replace(/\/api\/v1\/?$/, '')
        const refreshRes = await axios.post(`${currentBase}/api/v1/auth/refresh`, {
          refreshToken: savedRefreshToken,
        })

        const refreshData = unwrapNestResponse<any>(refreshRes.data)
        const result = refreshData || refreshRes.data
        const newToken = (result.token || result.accessToken) as string
        const newRefreshToken = (result.refreshToken || savedRefreshToken) as string

        if (!newToken) {
          throw new Error('Máy chủ không cấp token mới')
        }

        // Lưu token mới vào AsyncStorage và Zustand Store
        await useAuthStore.getState().setToken(newToken, newRefreshToken)

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }

        processQueue(null, newToken)
        return api(originalRequest)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        await useAuthStore.getState().logout()
        return Promise.reject(new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'))
      } finally {
        isRefreshing = false
      }
    }

    // 3. Xử lý lỗi đối tượng errors (422 Unprocessable Entity từ NestJS Auth)
    if (data?.errors && typeof data.errors === 'object') {
      const messages: string[] = []
      for (const [key, val] of Object.entries(data.errors)) {
        if (key === 'email' && val === 'notFound') messages.push('Tài khoản hoặc số điện thoại không tồn tại.')
        else if (key === 'email' && val === 'inactive') messages.push('Tài khoản chưa được kích hoạt.')
        else if (key === 'password' && val === 'incorrectPassword') messages.push('Mật khẩu không chính xác.')
        else if (typeof val === 'string') messages.push(val)
      }
      if (messages.length > 0) {
        return Promise.reject(new Error(messages.join('. ')))
      }
    }

    // 4. Xử lý message dạng mảng (class-validator)
    if (Array.isArray(data?.message)) {
      return Promise.reject(new Error(data.message.join('. ')))
    }

    // 5. Xử lý message thông thường
    const serverMessage = data?.message || 'Có lỗi xảy ra từ máy chủ.'
    return Promise.reject(new Error(serverMessage))
  }
)

export type NestResponse<T> = {
  success: boolean
  statusCode: number
  message: string
  data: T
}

export function unwrapNestResponse<T>(payload: any): T {
  if (payload && typeof payload === 'object' && 'data' in payload && 'success' in payload) {
    return payload.data as T
  }
  return payload as T
}
