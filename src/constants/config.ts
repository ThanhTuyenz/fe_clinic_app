import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const API_PORT = String(process.env.EXPO_PUBLIC_API_PORT || '8011').trim()

function getDebuggerIp(): string | null {
  const raw = Constants.expoGoConfig?.debuggerHost ?? Constants.expoConfig?.hostUri
  if (!raw) return null
  const ip = String(raw).split(':')[0]?.trim()
  if (!ip || ip === 'localhost' || ip === '127.0.0.1') return null
  return ip
}

export function resolveApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
  const auto = process.env.EXPO_PUBLIC_API_AUTO !== '0'

  if (typeof __DEV__ !== 'undefined' && __DEV__ && auto) {
    const ip = getDebuggerIp()
    if (ip) return `http://${ip}:${API_PORT}`
  }

  if (envUrl) return envUrl.replace(/\/$/, '')

  if (Platform.OS === 'android') return `http://10.0.2.2:${API_PORT}`
  return `http://localhost:${API_PORT}`
}

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'vitacare_auth_token',
  REFRESH_TOKEN: 'vitacare_refresh_token',
  USER_DATA: 'vitacare_user_data',
  REMEMBER_ME: 'vitacare_remember_me',
} as const
