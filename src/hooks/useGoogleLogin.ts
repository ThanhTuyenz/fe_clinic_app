import { useRef, useState } from 'react'
import { Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/useAuthStore'
import { useBookingStore } from '../store/useBookingStore'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createGoogleLoginStep, GOOGLE_LOGIN_LABELS, type GoogleLoginStage } from '../utils/googleLoginProgress'

export function useGoogleLogin() {
  const router = useRouter()
  const { redirect } = useLocalSearchParams<{ redirect?: string }>()
  const busy = useRef(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleStage, setGoogleStage] = useState<GoogleLoginStage>('preparing')

  const loginWithGoogle = async () => {
    if (busy.current) return
    busy.current = true
    setGoogleLoading(true)
    const step = createGoogleLoginStep(setGoogleStage)
    try {
      await step('preparing', async () => {
        if (redirect === '/booking/family') await AsyncStorage.setItem('vitacare_auth_return', redirect)
        else await AsyncStorage.removeItem('vitacare_auth_return')
      })
      const session = await authService.loginWithGoogle(step)
      if (!session) return // Account selection was cancelled, or web OAuth has started.
      if (!session.token || !session.user) {
        throw new Error('Máy chủ chưa trả về thông tin đăng nhập. Vui lòng thử lại.')
      }
      await step('storage', () => useAuthStore.getState().setAuth(session.token, session.user, session.refreshToken))
      if (!useAuthStore.getState().isAuthenticated) {
        throw new Error('Không thể lưu phiên đăng nhập. Vui lòng thử lại.')
      }
      const { draft } = useBookingStore.getState()
      const hasDraft = Boolean(
        (draft.doctor || draft.healthPackage || draft.specialtyService || draft.specialty) &&
        draft.date && draft.slot
      )
      router.replace(redirect === '/booking/family' ? '/booking/family' : hasDraft ? '/booking/patient-info' : '/(tabs)')
      await AsyncStorage.removeItem('vitacare_auth_return')
    } catch (error) {
      Alert.alert('Đăng nhập Google thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại.')
    } finally {
      busy.current = false
      setGoogleLoading(false)
    }
  }

  return { loginWithGoogle, googleLoading, googleLoadingMessage: GOOGLE_LOGIN_LABELS[googleStage] }
}
