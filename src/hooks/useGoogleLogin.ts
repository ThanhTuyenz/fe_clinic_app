import { useRef, useState } from 'react'
import { Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { authService } from '../services/authService'
import { useAuthStore } from '../store/useAuthStore'
import { useBookingStore } from '../store/useBookingStore'

export function useGoogleLogin() {
  const router = useRouter()
  const busy = useRef(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const loginWithGoogle = async () => {
    if (busy.current) return
    busy.current = true
    setGoogleLoading(true)
    try {
      const session = await authService.loginWithGoogle()
      if (!session) return // Account selection was cancelled, or web OAuth has started.
      if (!session.token || !session.user) {
        throw new Error('Máy chủ chưa trả về thông tin đăng nhập. Vui lòng thử lại.')
      }
      await useAuthStore.getState().setAuth(session.token, session.user, session.refreshToken)
      if (!useAuthStore.getState().isAuthenticated) {
        throw new Error('Không thể lưu phiên đăng nhập. Vui lòng thử lại.')
      }
      const { draft } = useBookingStore.getState()
      const hasDraft = Boolean(
        (draft.doctor || draft.healthPackage || draft.specialtyService || draft.specialty) &&
        draft.date && draft.slot
      )
      router.replace(hasDraft ? '/booking/patient-info' : '/(tabs)')
    } catch (error) {
      Alert.alert('Đăng nhập Google thất bại', error instanceof Error ? error.message : 'Vui lòng thử lại.')
    } finally {
      busy.current = false
      setGoogleLoading(false)
    }
  }

  return { loginWithGoogle, googleLoading }
}
