import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ScreenShell } from '../../src/components/common/ScreenShell'

export default function BookingDispatcherScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    method?: string
    mode?: string
    doctorId?: string
    packageId?: string
    specialtyId?: string
    branchId?: string
    flow?: string
  }>()

  useEffect(() => {
    const isPackage = params.method === 'package' || Boolean(params.packageId)
    const isOnline = params.method === 'online' || params.method === 'online-consultation'
    const isDoctor =
      !isOnline &&
      (params.method === 'doctor' || Boolean(params.doctorId) || params.method === 'followup')
    const isAfterHours = params.mode === 'after-hours' || params.method === 'after-hours'

    const targetRoute = isPackage
      ? '/booking/package'
      : isDoctor
        ? '/booking/doctor'
        : isOnline
          ? '/booking/online'
          : isAfterHours
            ? '/booking/after-hours'
            : '/booking/specialty'

    // Forward params to target subflow
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && key !== 'method' && key !== 'mode') {
        searchParams.append(key, String(val))
      }
    })
    const query = searchParams.toString()
    const finalUrl = query ? `${targetRoute}?${query}` : targetRoute

    router.replace(finalUrl as any)
  }, [params, router])

  return (
    <ScreenShell showBackButton title="Đặt lịch khám bệnh">
      <View className="flex-1 items-center justify-center bg-white p-6">
        <ActivityIndicator size="large" color="#28a745" />
      </View>
    </ScreenShell>
  )
}
