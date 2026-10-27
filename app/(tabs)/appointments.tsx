import { useState } from 'react'
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
import { formatDateVi, formatCurrencyVi } from '../../src/utils/date'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'
import { Image } from 'expo-image'
import { canJoinTelehealth } from '../../src/services/telehealthService'

export default function AppointmentsScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming')

  const { data: appointments = [], isLoading, isError, refetch, isRefetching } = useMyAppointments()

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
        return null
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
          <View className="bg-primary-50 border border-primary-200 px-2.5 py-0.5 rounded-lg">
            <Text className="text-[11px] font-bold text-primary-700">Đã khám xong</Text>
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
    const doc = item.doctor as any
    const docName =
      doc?.fullName || doc?.full_name || doc?.name || item.healthPackage?.name || item.service?.name || 'Bác sĩ chuyên khoa'
    const docAvatar = doc?.avatar
    const docSpecialty =
      typeof doc?.specialty === 'object'
        ? doc?.specialty?.name
        : doc?.specialty || (item as any).specialty || ''

    const dateFormatted = formatDateVi(
      item.appointmentDate || item.appointment_date || item.createdAt || new Date().toISOString()
    )
    const slotTime = item.startTime && item.endTime
      ? `${String(item.startTime).slice(0, 5)} - ${String(item.endTime).slice(0, 5)}`
      : item.startTime || item.slot || '08:00'
    const branchName = item.branch?.name || 'VitaCare Clinic'
    const isOnline = Boolean(item.isTelehealth || item.bookingMethod?.code === 'ONLINE_CONSULTATION')
    const bookingCode = item.bookingCode || item.code || ''
    const patientName = (item as any).patient?.fullName || (item as any).patientProfile?.fullName || ''
    const roomName = (item as any).room?.name ? `Phòng ${(item as any).room.name}` : ''
    const queueNumber = item.queueNumber
    const totalAmount = item.totalAmount || (item as any).consultation_fee
    const canJoin = canJoinTelehealth(item)

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push(`/booking/${item.id || item._id}`)}
        className="bg-[#28a745]/[0.06] rounded-lg p-4 mb-2.5 border border-slate-200/90"
        style={{ backgroundColor: 'rgba(40, 167, 69, 0.06)' }}
      >
        {/* Header: Ngày giờ & Mã phiếu khám */}
        <View className="flex-row items-center justify-between pb-3 border-b border-slate-200/60">
          <View className="flex-row items-center flex-1 pr-2">
            <View className="w-8 h-8 rounded-lg bg-white items-center justify-center mr-2.5 border border-slate-200/60">
              <Ionicons name="calendar-outline" size={15} color="#475569" />
            </View>
            <View>
              <Text className="text-sm font-bold text-slate-800">
                {dateFormatted}
              </Text>
              <Text className="text-xs font-semibold text-primary-700 mt-0.5">
                {slotTime}
              </Text>
            </View>
          </View>
          {bookingCode ? (
            <View className="bg-white px-2 py-1 rounded border border-slate-200/80">
              <Text className="text-xs font-mono font-bold text-slate-700">
                #{bookingCode}
              </Text>
            </View>
          ) : renderStatusBadge(item.status)}
        </View>

        {/* Thân thẻ: Avatar bác sĩ & Chuyên khoa */}
        <View className="pt-3 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-2">
            {docAvatar ? (
              <Image
                source={{ uri: docAvatar }}
                style={{ width: 44, height: 44, borderRadius: 22, marginRight: 12 }}
                contentFit="cover"
              />
            ) : (
              <View className="w-11 h-11 rounded-full bg-white items-center justify-center mr-3 border border-slate-200/60">
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#475569"
                />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                {docName}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                {docSpecialty ? `Chuyên khoa: ${docSpecialty}` : (isOnline ? 'Tư vấn trực tuyến' : 'Khám chuyên khoa')}
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </View>

        {/* Thông tin chi tiết bổ sung (Bệnh nhân, Cơ sở / Hình thức, Phòng/STT, Chi phí) */}
        <View className="mt-3 pt-2.5 border-t border-slate-200/60">
          {/* Bệnh nhân */}
          {patientName ? (
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center">
                <Ionicons name="person-circle-outline" size={14} color="#64748b" />
                <Text className="text-xs text-slate-500 ml-1.5">Bệnh nhân:</Text>
              </View>
              <Text className="text-xs font-bold text-slate-800">{patientName}</Text>
            </View>
          ) : null}

          {/* Hình thức / Địa điểm */}
          <View className="flex-row items-center justify-between mb-1.5">
            <View className="flex-row items-center">
              <Ionicons
                name={isOnline ? 'videocam-outline' : 'business-outline'}
                size={14}
                color="#64748b"
              />
              <Text className="text-xs text-slate-500 ml-1.5">
                {isOnline ? 'Hình thức:' : 'Cơ sở:'}
              </Text>
            </View>
            <Text className="text-xs font-semibold text-slate-800 text-right max-w-[210px]" numberOfLines={1}>
              {isOnline ? 'Tư vấn trực tuyến 1:1' : branchName}
            </Text>
          </View>

          {/* Phòng khám / Số thứ tự */}
          {(!isOnline && roomName) || queueNumber ? (
            <View className="flex-row items-center justify-between mb-1.5">
              <View className="flex-row items-center">
                <Ionicons name="medical-outline" size={14} color="#64748b" />
                <Text className="text-xs text-slate-500 ml-1.5">{isOnline ? 'Số thứ tự:' : 'Tiếp đón:'}</Text>
              </View>
              <Text className="text-xs font-bold text-primary-700">
                {!isOnline && roomName ? `${roomName}` : ''}{!isOnline && roomName && queueNumber ? ' • ' : ''}{queueNumber ? `STT #${queueNumber}` : ''}
              </Text>
            </View>
          ) : null}

          {/* Chi phí khám */}
          {totalAmount ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="wallet-outline" size={14} color="#64748b" />
                <Text className="text-xs text-slate-500 ml-1.5">Chi phí khám:</Text>
              </View>
              <Text className="text-xs font-bold text-slate-800">
                {formatCurrencyVi(Number(totalAmount))}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Nút vào phòng tư vấn chuẩn màu primary của dự án */}
        {canJoin && (
          <TouchableOpacity
            onPress={(event) => {
              event.stopPropagation()
              router.push(`/consultation/${item.id}`)
            }}
            className="mt-3 flex-row items-center justify-center rounded-lg bg-primary-600 active:bg-primary-700 py-2.5 px-4"
            accessibilityRole="button"
          >
            <Ionicons name="videocam-outline" size={18} color="white" />
            <Text className="ml-2 text-sm font-bold text-white">Vào phòng tư vấn</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    )
  }

  if (!isAuthenticated) {
    return (
      <ScreenShell title="Lịch hẹn khám">
        <View className="flex-1 items-center justify-center p-6 bg-slate-50">
          <View className="w-14 h-14 rounded-lg bg-slate-100 items-center justify-center mb-3">
            <Ionicons name="lock-closed-outline" size={28} color="#475569" />
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
            className="w-48 py-3 rounded-lg"
          />
        </View>
      </ScreenShell>
    )
  }

  return (
    <ScreenShell title="Lịch hẹn của tôi">
      <View className="flex-1 bg-slate-50">
        {/* Tabs Filter */}
        <View className="flex-row px-4 py-2.5 bg-white border-b border-slate-200/80">
          <TouchableOpacity
            onPress={() => setTab('upcoming')}
            className={`flex-1 py-2 rounded-lg items-center mr-1.5 border ${
              tab === 'upcoming'
                ? 'bg-slate-900 border-slate-900'
                : 'bg-white border-slate-200'
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
            className={`flex-1 py-2 rounded-lg items-center ml-1.5 border ${
              tab === 'history'
                ? 'bg-slate-900 border-slate-900'
                : 'bg-white border-slate-200'
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
        <View className="flex-1 px-4 pt-3">
          {isLoading ? (
            <ActivityIndicator size="small" color="#28a745" className="py-8" />
          ) : isError ? (
            <Button title="Không tải được lịch khám. Thử lại" variant="outline" onPress={() => { void refetch() }} />
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
                className="mt-4 py-2.5 rounded-lg"
              />
            </View>
          ) : (
            <FlatList
              data={displayedList}
              keyExtractor={(item) => String(item.id || item._id)}
              renderItem={renderAppointmentItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 24 }}
              refreshControl={
                <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch() }} />
              }
            />
          )}
        </View>
      </View>
    </ScreenShell>
  )
}
