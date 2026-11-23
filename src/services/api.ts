import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { resolveApiBaseUrl, STORAGE_KEYS } from '../constants/config'
import { useAuthStore } from '../store/useAuthStore'

const REQUEST_TIMEOUT = 15000
const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
class SessionExpiredError extends Error {
  constructor() { super(SESSION_EXPIRED) }
}
type AuthRequest = InternalAxiosRequestConfig & { _retry?: boolean; _sessionVersion?: number }
type RefreshResponse = { token?: string; accessToken?: string; refreshToken?: string }

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Tự động gắn Bearer Token
api.interceptors.request.use(
  async (config: AuthRequest) => {
    config._sessionVersion ??= useAuthStore.getState().sessionVersion
    try {
      config.baseURL = resolveApiBaseUrl()
      // Preserve an explicit token (getMe) or an explicitly disabled header (Google login).
      if (config.headers.has('Authorization')) return config
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

// Requests in the same session share one refresh, including its failure.
let refreshing: { sessionVersion: number; promise: Promise<string> } | null = null

function requireCurrentSession(sessionVersion: number) {
  if (useAuthStore.getState().sessionVersion !== sessionVersion) {
    throw new axios.CanceledError('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.')
  }
}

async function refreshAccessToken(sessionVersion: number): Promise<string> {
  try {
    const savedRefreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
    requireCurrentSession(sessionVersion)
    if (!savedRefreshToken) {
      throw new SessionExpiredError()
    }

    const currentBase = resolveApiBaseUrl().replace(/\/api\/v1\/?$/, '')
    // Use raw axios to avoid re-entering the response interceptor.
    const response = await axios.post(`${currentBase}/api/v1/auth/refresh`, {
      refreshToken: savedRefreshToken,
    }, { timeout: REQUEST_TIMEOUT })
    requireCurrentSession(sessionVersion)

    const result = unwrapNestResponse<RefreshResponse>(response.data)
    const token = result?.token || result?.accessToken
    if (typeof token !== 'string' || !token.trim()) {
      throw new Error('Máy chủ chưa cấp được token mới. Vui lòng thử lại.')
    }
    const refreshToken = typeof result.refreshToken === 'string' && result.refreshToken.trim()
      ? result.refreshToken : savedRefreshToken
    await useAuthStore.getState().setToken(token, refreshToken)
    requireCurrentSession(sessionVersion)
    return token
  } catch (error) {
    if (axios.isCancel(error)) throw error
    requireCurrentSession(sessionVersion)
    if (error instanceof SessionExpiredError || (axios.isAxiosError(error)
      && (error.response?.status === 401 || error.response?.status === 403))) {
      await useAuthStore.getState().logout()
      throw new SessionExpiredError()
    }
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new Error('Chưa thể làm mới phiên đăng nhập. Vui lòng kiểm tra kết nối mạng và thử lại.')
      }
      throw Object.assign(new Error('Máy chủ chưa thể làm mới phiên đăng nhập. Vui lòng thử lại sau.'), { status: error.response.status })
    }
    throw error
  }
}

function getRefreshedToken(sessionVersion: number): Promise<string> {
  if (refreshing?.sessionVersion === sessionVersion) return refreshing.promise
  const promise = refreshAccessToken(sessionVersion).finally(() => {
    if (refreshing?.promise === promise) refreshing = null
  })
  refreshing = { sessionVersion, promise }
  return promise
}

// Response Interceptor: Xử lý lỗi tập trung & Tự động Refresh Token khi gặp 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[]; code?: string; errors?: Record<string, string> }>) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const originalRequest = error.config as AuthRequest | undefined

    // 1. Không kết nối được server
    if (!error.response) {
      const currentBase = resolveApiBaseUrl()
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return Promise.reject(new Error('Máy chủ phản hồi quá lâu. Vui lòng kiểm tra kết nối mạng và thử lại.'))
      }
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
      const sessionVersion = originalRequest._sessionVersion ?? useAuthStore.getState().sessionVersion
      requireCurrentSession(sessionVersion)
      if (originalRequest._retry) {
        await useAuthStore.getState().logout()
        return Promise.reject(new Error(SESSION_EXPIRED))
      }

      // Mark every request before waiting, so queued requests also retry only once.
      originalRequest._retry = true
      // A delayed 401 may arrive after another request already refreshed the token.
      const currentToken = useAuthStore.getState().token
      const failedToken = originalRequest.headers.get('Authorization')
      const newToken = currentToken && failedToken !== `Bearer ${currentToken}`
        ? currentToken : await getRefreshedToken(sessionVersion)
      requireCurrentSession(sessionVersion)
      originalRequest.headers.set('Authorization', `Bearer ${newToken}`)
      return api(originalRequest)
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
        return Promise.reject(Object.assign(new Error(messages.join('. ')), { status }))
      }
    }

    // 4. Xử lý message dạng mảng (class-validator)
    if (Array.isArray(data?.message)) {
      return Promise.reject(Object.assign(new Error(data.message.join('. ')), { status }))
    }

    // 5. Xử lý message thông thường
    const serverMessage = data?.message || 'Có lỗi xảy ra từ máy chủ.'
    return Promise.reject(Object.assign(new Error(serverMessage), { status }))
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
