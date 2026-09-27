import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { resolveApiBaseUrl, STORAGE_KEYS } from '../constants/config'

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
      // Luôn cập nhật baseURL động nếu cần
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

// Response Interceptor: Xử lý lỗi tập trung
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; code?: string }>) => {
    if (!error.response) {
      const currentBase = resolveApiBaseUrl()
      const msg = `Không thể kết nối đến máy chủ (${currentBase}). Vui lòng kiểm tra backend và kết nối Wi-Fi.`
      return Promise.reject(new Error(msg))
    }

    const serverMessage = error.response.data?.message || 'Có lỗi xảy ra từ máy chủ.'
    return Promise.reject(new Error(serverMessage))
  }
)
