import React from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { clinicHomepageQuery } from '../../queries/homeQueries'
export const FacilitiesSection: React.FC = React.memo(() => {
  const router = useRouter()
  const query = useQuery(clinicHomepageQuery)
  return <View className="mt-8"><View className="mb-4 flex-row items-center justify-between px-5"><Text className="text-base font-bold text-slate-900">Cơ sở y tế VitaCare</Text><TouchableOpacity onPress={() => router.push('/facilities')}><Text className="text-xs font-semibold text-primary-700">Xem tất cả</Text></TouchableOpacity></View>
    {query.isLoading ? <ActivityIndicator color="#28a745" /> : query.isError ? <TouchableOpacity onPress={() => { void query.refetch() }}><Text className="px-5 text-rose-700">Không tải được cơ sở. Nhấn để thử lại.</Text></TouchableOpacity> : !query.data?.branches.length ? <Text className="px-5 text-slate-500">Chưa có cơ sở hoạt động.</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>{query.data.branches.map(branch => <TouchableOpacity key={branch.id} onPress={() => router.push('/facilities')} className="mr-3 w-64 rounded-xl border border-slate-200 bg-white p-4"><Text className="font-bold text-slate-900">{branch.name}</Text><Text className="mt-2 text-xs leading-5 text-slate-600">{branch.address || 'Địa chỉ đang cập nhật'}</Text><Text className="mt-2 text-xs text-primary-700">{branch.phoneNumber}</Text><TouchableOpacity onPress={() => router.push({ pathname: '/booking/specialty', params: { branchId: branch.id } })} className="mt-4 rounded-lg bg-primary-50 p-2"><Text className="text-center text-xs font-semibold text-primary-700">Đặt khám tại cơ sở</Text></TouchableOpacity></TouchableOpacity>)}</ScrollView>}
  </View>
})
