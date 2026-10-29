import React, { useState } from 'react'
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native'
import { SelectModal } from '../common/SelectModal'
import { PatientProfile } from '../../services/patientProfileService'
import { searchAnalytics } from '../../services/searchAnalytics'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { appointmentService } from '../../services/appointmentService'
import { useAuthStore } from '../../store/useAuthStore'
import { RecommendedPackageItem } from '../../services/recommendationService'
import { PackageCard, PackageCardBadge } from './PackageCard'
import { formatDateVi } from '../../utils/date'
import { useRecommendationImpressions } from '../../hooks/useRecommendationImpressions'

export interface RecommendationSectionProps {
  packages: RecommendedPackageItem[]
  isLoading?: boolean
  onRefresh?: () => void
  onSelectPackage: (pkg: RecommendedPackageItem) => void
  profiles?: PatientProfile[]
  profileId?: string
  onSelectProfile?: (id: string) => void
  trackingToken?: string
  refreshing?: boolean
  error?: boolean
  onRetry?: () => void
}

export const RecommendationSection: React.FC<RecommendationSectionProps> = ({
  packages,
  isLoading,
  onRefresh,
  onSelectPackage,
  profiles = [], profileId, onSelectProfile, trackingToken, refreshing, error, onRetry,
}) => {
  const router = useRouter()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const userId = useAuthStore((state) => state.user?.id)
  const [showProfiles, setShowProfiles] = useState(false)
  const activeProfile = profiles.find(profile => profile.id === profileId)
  const impressions = useRecommendationImpressions(packages, trackingToken)

  const { data: appointments = [] } = useQuery({
    queryKey: ['myAppointments', userId],
    queryFn: () => appointmentService.getMyAppointments(),
    enabled: isAuthenticated,
    staleTime: 30_000,
  })

  // Lấy lịch hẹn sắp tới gần nhất (chưa hủy / chưa hoàn thành)
  const upcomingAppointment = appointments.find(
    (app) => app.status === 'CONFIRMED' || app.status === 'PENDING' || app.status === 'WAITING'
  )

  return (
    <View ref={impressions.containerRef} collapsable={false} className="mt-7 pt-1">
      {/* 1. Header Khối 1 */}
      <View className="px-5 flex-row items-start justify-between mb-3.5">
        <View className="flex-1 mr-2">
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            {isAuthenticated ? 'Gợi ý cho bạn' : 'Gói khám nổi bật'}
          </Text>
          {isAuthenticated && profiles.length > 0 ? (
            <View className="flex-row items-center mt-2">
              <Text className="text-xs text-slate-500 mr-2">Dành cho</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Chọn hồ sơ nhận gợi ý${activeProfile ? `, hiện tại ${activeProfile.fullName}` : ''}`}
                accessibilityState={{ expanded: showProfiles }}
                onPress={() => setShowProfiles(true)}
                activeOpacity={0.7}
                className="flex-row items-center shrink min-h-11 rounded-full  px-3 py-2"
              >
                <Text numberOfLines={1} className="shrink text-xs font-medium text-primary-800 mr-2">
                  {activeProfile?.fullName || 'Chọn hồ sơ'}
                </Text>
                <Ionicons name="chevron-down" size={13} color="#28a745" />
              </TouchableOpacity>
            </View>
          ) : (
            <Text className="text-xs text-slate-500 mt-1 leading-4">
              {isAuthenticated
                ? 'Khám phá các gói khám phù hợp với nhu cầu của bạn'
                : 'Khám phá các gói khám nổi bật tại VitaCare Clinic'}
            </Text>
          )}
        </View>

        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            disabled={refreshing || isLoading}
            accessibilityRole="button"
            accessibilityLabel={refreshing ? 'Đang làm mới gợi ý' : 'Làm mới gợi ý'}
            accessibilityState={{ disabled: Boolean(refreshing || isLoading), busy: refreshing }}
            className="w-11 h-11 items-center justify-center rounded-full active:bg-primary-50"
          >
            <Ionicons name="refresh-outline" size={18} color={refreshing || isLoading ? '#94a3b8' : '#28a745'} />
          </TouchableOpacity>
        )}
      </View>

      {refreshing && <View accessibilityLiveRegion="polite" className="mx-5 mb-3 flex-row items-center gap-2">
        <ActivityIndicator size="small" color="#28a745" />
        <Text className="text-xs text-slate-500">Đang làm mới gợi ý...</Text>
      </View>}

      {isAuthenticated && profiles.length > 0 && (
        <SelectModal
          visible={showProfiles}
          title="Chọn hồ sơ nhận gợi ý"
          onClose={() => setShowProfiles(false)}
          options={profiles.map(profile => ({ id: profile.id, title: profile.fullName }))}
          selectedId={profileId}
          onSelect={option => { onSelectProfile?.(String(option.id)); setShowProfiles(false) }}
        />
      )}
      {error && <View className="mx-5 mb-3 rounded-lg border border-rose-200 bg-rose-50 p-3"><Text className="text-sm text-rose-700">Không thể tải hoặc làm mới gợi ý lúc này.</Text><TouchableOpacity onPress={onRetry}><Text className="mt-2 font-semibold text-primary-700">Thử lại</Text></TouchableOpacity></View>}

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
      ) : error && packages.length === 0 ? null : packages.length === 0 ? (
        <View className="bg-white mx-5 p-5 rounded-lg border border-slate-100 items-center">
          <Ionicons name="sparkles-outline" size={24} color="#cbd5e1" />
          <Text className="text-slate-400 text-xs text-center mt-1.5 font-medium">
            Chưa có dữ liệu gợi ý. Hãy bắt đầu khám phá các chuyên khoa!
          </Text>
        </View>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          data={packages}
          keyExtractor={pkg => `${trackingToken || ''}:${pkg.packageId}`}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={3}
          renderItem={({ item: pkg, index }) => {
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
            } else if (pkg.sourceType === 'PROFILE_AI' || pkg.sourceType === 'BOTH' || pkg.badge === 'Phù hợp hồ sơ') {
              badge = {
                label: pkg.sourceType === 'BOTH' ? 'Phù hợp cả hai' : 'Phù hợp hồ sơ',
                color: 'text-purple-700',
                bg: 'bg-purple-50 border-purple-200',
                icon: 'heart-outline',
              }
            }

            return (
              <View ref={node => impressions.register(pkg.packageId, index + 1, node)} collapsable={false}>
              <PackageCard
                id={pkg.packageId}
                name={pkg.name}
                description={pkg.clinicalReason}
                price={pkg.price}
                specialtyName={pkg.specialtyName}
                badge={badge}
                onPress={() => { if (trackingToken) void searchAnalytics.recommendation('RECOMMEND_CLICK', trackingToken, pkg.packageId, index + 1).catch(() => {}); onSelectPackage(pkg) }}
                onDetailPress={() => { if (trackingToken) void searchAnalytics.recommendation('RECOMMEND_CLICK', trackingToken, pkg.packageId, index + 1).catch(() => {}); router.push(`/package/${pkg.packageId}` as any) }}
              />
              </View>
            )
          }}
        />
      )}
    </View>
  )
}

