import React from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { appointmentService } from '../../services/appointmentService'
import { useAuthStore } from '../../store/useAuthStore'
import { RecommendedPackageItem } from '../../services/recommendationService'
import { PackageCard, PackageCardBadge } from './PackageCard'
import { formatDateVi } from '../../utils/date'

export interface RecommendationSectionProps {
  packages: RecommendedPackageItem[]
  isLoading?: boolean
  onRefresh?: () => void
  onSelectPackage: (pkg: RecommendedPackageItem) => void
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  packages,
  isLoading,
  onRefresh,
  onSelectPackage,
}) => {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const { data: appointments = [] } = useQuery({
    queryKey: ['myAppointments'],
    queryFn: () => appointmentService.getMyAppointments(),
    enabled: isAuthenticated,
  })

  // Lấy lịch hẹn sắp tới gần nhất (chưa hủy / chưa hoàn thành)
  const upcomingAppointment = appointments.find(
    (app) => app.status === 'CONFIRMED' || app.status === 'PENDING' || app.status === 'WAITING'
  )

  return (
    <View className="mt-7 pt-1">
      {/* 1. Header Khối 1 */}
      <View className="px-5 flex-row items-center justify-between mb-3.5">
        <View className="flex-1 mr-2">
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Gợi ý cho bạn
          </Text>
          <Text className="text-[11px] text-slate-400 mt-0.5">
            Đề xuất phù hợp với bạn
          </Text>
        </View>

        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            className="flex-row items-center bg-slate-50 px-2.5 py-1 rounded border border-slate-200/80 active:bg-slate-100"
          >
            <Ionicons name="refresh" size={11} color="#28a745" style={{ marginRight: 4 }} />
            <Text className="text-[11px] font-semibold text-slate-700">Làm mới</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Thẻ Nhắc lịch khám (Nếu có lịch hẹn) */}
      {upcomingAppointment && (
        <View className="mx-5 mb-4 p-3 bg-primary-50/70 rounded-xl border border-primary-200/80 shadow-2xs">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="w-8 h-8 rounded-full bg-primary-100 items-center justify-center mr-2.5">
                <Ionicons name="calendar-outline" size={17} color="#28a745" />
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium text-primary-800">
                  Lịch hẹn khám sắp tới
                </Text>
                <Text className="text-xs font-semibold text-slate-800 mt-0.5">
                  {upcomingAppointment.appointment_date ? formatDateVi(upcomingAppointment.appointment_date) : 'Hôm nay'} • {upcomingAppointment.startTime || '08:00'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(tabs)/appointments')}
              className="bg-primary-600 active:bg-primary-800 px-3.5 py-1.5 rounded-lg"
            >
              <Text className="text-xs font-semibold text-white">Xem</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 3. Danh sách gói khám AI cá nhân hóa (Hồ sơ + Hành vi) */}
      {isLoading ? (
        <ActivityIndicator size="small" color="#28a745" className="py-6" />
      ) : packages.length === 0 ? (
        <View className="bg-white mx-5 p-5 rounded-lg border border-slate-100 items-center">
          <Ionicons name="sparkles-outline" size={24} color="#cbd5e1" />
          <Text className="text-slate-400 text-xs text-center mt-1.5 font-medium">
            Chưa có dữ liệu gợi ý. Hãy bắt đầu khám phá các chuyên khoa!
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {packages.map((pkg) => {
            let badge: PackageCardBadge | null = {
              label: pkg.badge || 'Tầm soát định kỳ',
              color: 'text-primary-700',
              bg: 'bg-primary-50 border-primary-200',
              icon: 'shield-checkmark-outline',
            }

            if (pkg.sourceType === 'DROP_OFF' || pkg.badge === 'Tiếp tục đặt lịch') {
              badge = {
                label: 'Tiếp tục đặt lịch',
                color: 'text-rose-700',
                bg: 'bg-rose-50 border-rose-200',
                icon: 'time-outline',
              }
            } else if (pkg.sourceType === 'SEARCH_INTENT' || pkg.badge === 'Tìm kiếm gần đây') {
              badge = {
                label: 'Tìm kiếm gần đây',
                color: 'text-blue-700',
                bg: 'bg-blue-50 border-blue-200',
                icon: 'search-outline',
              }
            } else if (pkg.sourceType === 'PROFILE_AI' || pkg.badge === 'Phù hợp hồ sơ') {
              badge = {
                label: 'Phù hợp hồ sơ',
                color: 'text-purple-700',
                bg: 'bg-purple-50 border-purple-200',
                icon: 'heart-outline',
              }
            }

            return (
              <PackageCard
                key={pkg.packageId}
                id={pkg.packageId}
                name={pkg.name}
                description={pkg.clinicalReason}
                price={pkg.price}
                specialtyName={pkg.specialtyName}
                badge={badge}
                onPress={() => onSelectPackage(pkg)}
                onDetailPress={() => router.push(`/package/${pkg.packageId}` as any)}
              />
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

