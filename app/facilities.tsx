import { ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { clinicService } from '../src/services/clinicService'
import { ScreenShell } from '../src/components/common/ScreenShell'
import { Button } from '../src/components/common/Button'
export default function FacilitiesScreen() {
  const router = useRouter()
  const query = useQuery({ queryKey: ['clinicHomepage'], queryFn: () => clinicService.homepage() })
  return <ScreenShell showBackButton title="Hệ thống cơ sở VitaCare"><ScrollView contentContainerStyle={{ padding: 20 }}>
    {query.isLoading ? <ActivityIndicator color="#28a745" /> : query.isError ? <Button title="Không tải được cơ sở. Thử lại" onPress={() => { void query.refetch() }} /> : !query.data?.branches.length ? <Text className="text-slate-500">Chưa có cơ sở hoạt động.</Text> : query.data.branches.map(branch => <View key={branch.id} className="mb-4 rounded-xl border border-slate-200 bg-white p-4"><Text className="text-lg font-semibold text-slate-900">{branch.name}</Text><Text className="my-3 text-slate-600">{branch.address || 'Địa chỉ đang cập nhật'}</Text>
      {branch.phoneNumber && <TouchableOpacity onPress={() => { void Linking.openURL(`tel:${branch.phoneNumber!.replace(/[^+\d]/g, '')}`).catch(() => {}) }}><Text className="mb-3 text-primary-700">Gọi cơ sở: {branch.phoneNumber}</Text></TouchableOpacity>}
      {branch.address && <TouchableOpacity onPress={() => { void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.address!)}`).catch(() => {}) }}><Text className="mb-4 text-primary-700">Xem đường đi →</Text></TouchableOpacity>}
      <Button title="Đặt khám tại cơ sở" onPress={() => router.push({ pathname: '/booking/specialty', params: { branchId: branch.id } })} />
    </View>)}
  </ScrollView></ScreenShell>
}
