import React, { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useMyAppointments } from '../../src/hooks/useBooking'
import { useAuthStore } from '../../src/store/useAuthStore'
import { Appointment } from '../../src/types/appointment'
import { formatDateVi } from '../../src/utils/date'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'

export default function AppointmentsScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming')

  const { data: appointments = [], isLoading, refetch, isRefetching } = useMyAppointments()

  const isUpcoming = (status?: string) => {
    const s = (status || '').toUpperCase()
    return s === 'HOLD' || s === 'CONFIRMED' || s === 'CHECKED_IN' || s === 'IN_EXAMINATION' || s === 'PENDING'
  }

  const isHistory = (status?: string) => {
    const s = (status || '').toUpperCase()
    return s === 'COMPLETED' || s === 'CANCELLED'
  }

  const upcomingList = appointments.filter((a) => isUpcoming(a.status))
  const historyList = appointments.filter((a) => isHistory(a.status))

  const displayedList = tab === 'upcoming' ? upcomingList : historyList

  const renderStatusBadge = (rawStatus?: string) => {
    const status = (rawStatus || '').toUpperCase()
    switch (status) {
      case 'CONFIRMED':
        return (
          <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
            <Text className="text-[11px] font-bold text-emerald-700">Đã xác nhận</Text>
          </View>
        )
      case 'CHECKED_IN':
        return (
          <View className="bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
            <Text className="text-[11px] font-bold text-blue-700">Đã tiếp đón</Text>
          </View>
        )
      case 'IN_EXAMINATION':
        return (
          <View className="bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-lg">
            <Text className="text-[11px] font-bold text-sky-700">Đang khám</Text>
          </View>
        )
      case 'HOLD':
      case 'PENDING':
        return (
          <View className="bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
            <Text className="text-[11px] font-bold text-amber-700">Chờ tiếp nhận</Text>
          </View>
        )
      case 'COMPLETED':
        return (
          <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
            <Text className="text-[11px] font-bold text-emerald-700">Đã khám xong</Text>
          </View>
        )
      case 'CANCELLED':
      default:
        return (
          <View className="bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-lg">
            <Text className="text-[11px] font-bold text-rose-700">Đã hủy</Text>
          </View>
        )
    }
  }

  const renderAppointmentItem = ({ item }: { item: Appointment }) => {
    const docName =
      item.doctor?.full_name || item.doctor?.fullName || item.doctor?.name || 'Bác sĩ chuyên khoa'
    const serviceName =
      item.healthPackage?.name || item.service?.name || docName
    const dateFormatted = formatDateVi(item.appointmentDate || item.appointment_date || item.createdAt || new Date().toISOString())
    const slotTime = item.startTime || item.slot || '08:00'
    const branchName = item.branch?.name || 'VitaCare Clinic'

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/booking/${item.id || item._id}`)}
        className="bg-white rounded-lg p-4 mb-3 border border-slate-100 shadow-sm"
      >
        <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
          <View className="flex-row items-center flex-1 pr-2">
            <View className="w-8 h-8 rounded-lg bg-emerald-50 items-center justify-center mr-2">
              <Ionicons name="calendar-outline" size={16} color="#059669" />
            </View>
            <Text className="text-sm font-bold text-slate-800">
              {dateFormatted}
            </Text>
            <Text className="text-xs text-slate-500 ml-2">({slotTime})</Text>
          </View>
          {renderStatusBadge(item.status)}
        </View>

        <View className="pt-3 flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text className="text-sm font-bold text-slate-800">{serviceName}</Text>
            <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
              {branchName} {item.queueNumber ? `• STT #${item.queueNumber}` : ''}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="qr-code-outline" size={20} color="#059669" />
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" className="ml-1" />
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  if (!isAuthenticated) {
    return (
      <ScreenShell title="Lịch hẹn khám">
        <View className="flex-1 items-center justify-center p-6">
          <View className="w-16 h-16 rounded-lg bg-emerald-50 items-center justify-center mb-3">
            <Ionicons name="lock-closed-outline" size={32} color="#059669" />
          </View>
          <Text className="text-lg font-bold text-slate-800 text-center">
            Đăng nhập để xem lịch hẹn
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1 mb-5">
            Quý khách vui lòng đăng nhập tài khoản để theo dõi lịch hẹn và phiếu khám.
          </Text>
          <Button
            title="Đăng nhập ngay"
            onPress={() => router.push('/(auth)/login')}
            className="w-48"
          />
        </View>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title="Lịch hẹn của tôi">
      {/* Tabs Filter */}
      <View className="flex-row px-5 py-3 bg-white border-b border-slate-100">
        <TouchableOpacity
          onPress={() => setTab('upcoming')}
          className={`flex-1 py-2 rounded-lg items-center mr-2 border ${
            tab === 'upcoming'
              ? 'bg-emerald-600 border-emerald-600'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              tab === 'upcoming' ? 'text-white' : 'text-slate-600'
            }`}
          >
            Sắp tới ({upcomingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('history')}
          className={`flex-1 py-2 rounded-lg items-center ml-2 border ${
            tab === 'history'
              ? 'bg-emerald-600 border-emerald-600'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              tab === 'history' ? 'text-white' : 'text-slate-600'
            }`}
          >
            Lịch sử ({historyList.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <View className="flex-1 px-5 pt-3">
        {isLoading ? (
          <ActivityIndicator size="small" color="#0284c7" className="py-8" />
        ) : displayedList.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="calendar-outline" size={48} color="#cbd5e1" />
            <Text className="text-slate-500 text-sm font-medium mt-3">
              {tab === 'upcoming'
                ? 'Bạn không có lịch hẹn sắp tới nào.'
                : 'Chưa có lịch sử khám bệnh.'}
            </Text>
            <Button
              title="Đặt lịch khám mới"
              variant="outline"
              size="sm"
              onPress={() => router.push('/booking')}
              className="mt-4"
            />
          </View>
        ) : (
          <FlatList
            data={displayedList}
            keyExtractor={(item) => String(item.id || item._id)}
            renderItem={renderAppointmentItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
          />
        )}
      </View>
    </ScreenShell>
  )
}
