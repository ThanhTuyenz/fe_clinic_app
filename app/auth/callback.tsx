import { useEffect } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/useAuthStore'
import { useBookingStore } from '@/store/useBookingStore'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function AuthCallbackScreen() {
  const router = useRouter()
  const { token, refreshToken } = useLocalSearchParams<{ token?: string; refreshToken?: string }>()
  const setAuth = useAuthStore((state) => state.setAuth)
  const draft = useBookingStore((state) => state.draft)

  useEffect(() => {
    if (!token) {
      router.replace('/(auth)/login')
      return
    }

    authService
      .getMe(token)
      .then(async ({ user }) => {
        if (!user) throw new Error('Không lấy được thông tin hồ sơ')
        await setAuth(token, user, refreshToken)
        const hasDraft = Boolean(draft.date && draft.slot && (draft.doctor || draft.healthPackage))
        const returnTo = await AsyncStorage.getItem('vitacare_auth_return')
        await AsyncStorage.removeItem('vitacare_auth_return')
        router.replace(returnTo === '/booking/family' ? '/booking/family' : hasDraft ? '/booking/patient-info' : '/(tabs)')
      })
      .catch(() => {
        router.replace('/(auth)/login')
      })
  }, [token])

  return <View className="flex-1 bg-white" />
}
