import Constants from 'expo-constants'
import { Platform } from 'react-native'

const API_PORT = String(process.env.EXPO_PUBLIC_API_PORT || '5000').trim()

/** IP máy dev từ Metro/Expo — cùng mạng với điện thoại khi chạy Expo Go */
function debuggerIp() {
  const raw = Constants.expoGoConfig?.debuggerHost ?? Constants.expoConfig?.hostUri
  if (!raw) return null
  const ip = String(raw).split(':')[0]?.trim()
  if (!ip || ip === 'localhost' || ip === '127.0.0.1') return null
  return ip
}

/**
 * Base URL của be_clinic.
 * Dev trên điện thoại: để EXPO_PUBLIC_API_AUTO=1 (mặc định) — tự lấy IP từ Expo, tránh IP cũ trong .env.
 */
export function getApiBase() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
  const auto = process.env.EXPO_PUBLIC_API_AUTO !== '0'

  if (typeof __DEV__ !== 'undefined' && __DEV__ && auto) {
    const ip = debuggerIp()
    if (ip) return `http://${ip}:${API_PORT}`
  }

  if (envUrl) return envUrl.replace(/\/$/, '')

  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`
  return `http://localhost:${API_PORT}`
}

export async function parseJsonResponse(res) {
  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { message: text || 'Lỗi không xác định.' }
  }
}

export function networkErrorMessage(base, err) {
  const hint =
    typeof __DEV__ !== 'undefined' && __DEV__
      ? ` Kiểm tra be_clinic đang chạy (npm run dev) và cùng Wi-Fi. URL hiện tại: ${base}`
      : ''
  return `Không kết nối được máy chủ.${hint} (${err?.message || 'network'})`
}
