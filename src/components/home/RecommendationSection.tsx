import React from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { RecommendedPackageItem } from '../../services/recommendationService'
import { PackageCard, PackageCardBadge } from './PackageCard'

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
  return (
    <View className="mt-7 pt-1">
      <View className="px-5 flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center">
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Gợi ý dành cho bạn
          </Text>
        </View>

        {onRefresh && (
          <TouchableOpacity
            onPress={onRefresh}
            className="flex-row items-center bg-slate-50 px-2.5 py-1 rounded border border-slate-200/80 active:bg-slate-100"
          >
            <Ionicons name="refresh" size={11} color="#059669" style={{ marginRight: 4 }} />
            <Text className="text-[11px] font-semibold text-slate-700">Làm mới</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#059669" className="py-6" />
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
              color: 'text-emerald-700',
              bg: 'bg-emerald-50 border-emerald-200',
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
              />
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
