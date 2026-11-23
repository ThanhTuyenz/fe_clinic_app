import { ActivityIndicator, ScrollView, Text, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api, unwrapNestResponse } from '../../src/services/api'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'
import { appointmentStatusTitle } from '../../src/utils/appointmentStatus'
import { formatCurrencyVi } from '../../src/utils/date'
export default function FamilyResultScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>()
  const router = useRouter()
  const result = useQuery({ queryKey: ['family-order', orderId], queryFn: async () => unwrapNestResponse<any>((await api.get(`/api/v1/payments/appointments/${orderId}/status`)).data), enabled: Boolean(orderId) })
  return <ScreenShell showBackButton title="Đơn khám gia đình"><ScrollView contentContainerStyle={{ padding: 20 }}>
    {result.isLoading ? <ActivityIndicator color="#28a745" /> : result.isError ? <Button title="Không tải được đơn. Thử lại" onPress={() => { void result.refetch() }} /> : <>
      <Text className="mb-3 text-lg font-bold text-slate-900">{result.data?.status === 'PAID' || result.data?.paymentStatus === 'SUCCESS' ? 'Đã thanh toán đơn gia đình' : 'Thông tin đơn khám gia đình'}</Text>
      <Text className="mb-4 text-slate-600">Tổng thanh toán: {formatCurrencyVi(Number(result.data?.totalAmount || 0))}</Text>
      {(result.data?.appointments || []).map((item: any) => <TouchableOpacity key={item.appointmentId} className="mb-3 rounded-xl border border-slate-200 bg-white p-4" onPress={() => router.push(`/booking/${item.appointmentId}`)}><Text className="font-semibold text-slate-900">{item.patient?.fullName}</Text><Text className="mt-1 text-slate-600">{appointmentStatusTitle(item.status)}</Text><Text className="mt-2 text-primary-700">Xem lịch khám →</Text></TouchableOpacity>)}
    </>}
  </ScrollView></ScreenShell>
}
