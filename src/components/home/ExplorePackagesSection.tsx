import React, { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { doctorService } from '../../services/doctorService'
import { useBookingStore } from '../../store/useBookingStore'
import { PackageCard } from './PackageCard'
import { HEALTH_PACKAGES } from './HealthPackagesSection'

export const ExplorePackagesSection: React.FC = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'general' | 'recent'>('general')
  const [recentPackages, setRecentPackages] = useState<any[]>([])

  const { data: generalPackages = [], isLoading: loadingGeneral } = useQuery({
    queryKey: ['healthPackages'],
    queryFn: () => doctorService.getHealthPackages(),
  })

  // Load recently viewed packages from AsyncStorage
  useEffect(() => {
    const loadRecents = async () => {
      try {
        const raw = await AsyncStorage.getItem('vitacare_recently_viewed_packages')
        if (raw) {
          const list = JSON.parse(raw)
          if (Array.isArray(list) && list.length > 0) {
            setRecentPackages(list)
          }
        }
      } catch {}
    }
    loadRecents()
  }, [activeTab])

  const displayList = activeTab === 'general'
    ? (generalPackages.length > 0 ? generalPackages : HEALTH_PACKAGES)
    : (recentPackages.length > 0 ? recentPackages : (generalPackages.length > 0 ? generalPackages.slice(0, 3) : HEALTH_PACKAGES.slice(0, 3)))

  return (
    <View className="mt-8 pt-1">
      {/* Header Gói khám nổi bật */}
      <View className="px-5 flex-row items-center justify-between mb-3">
        <View className="flex-1 mr-2">
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Gói khám nổi bật
          </Text>
          <Text className="text-[11px] text-slate-400 mt-0.5">
            Tầm soát định kỳ toàn diện
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/services')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xs font-semibold text-emerald-700">Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs chuyển đổi: "Tổng quát" | "Xem gần đây" */}
      <View className="px-5 flex-row items-center gap-2 mb-3.5">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('general')}
          className={`px-3 py-1.5 rounded-lg flex-row items-center border ${
            activeTab === 'general'
              ? 'bg-slate-900 border-slate-900'
              : 'bg-white border-slate-200'
          }`}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={13}
            color={activeTab === 'general' ? '#ffffff' : '#64748b'}
            style={{ marginRight: 5 }}
          />
          <Text
            className={`text-xs font-bold ${
              activeTab === 'general' ? 'text-white' : 'text-slate-700'
            }`}
          >
            Tổng quát
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('recent')}
          className={`px-3 py-1.5 rounded-lg flex-row items-center border ${
            activeTab === 'recent'
              ? 'bg-slate-900 border-slate-900'
              : 'bg-white border-slate-200'
          }`}
        >
          <Ionicons
            name="time-outline"
            size={13}
            color={activeTab === 'recent' ? '#ffffff' : '#64748b'}
            style={{ marginRight: 5 }}
          />
          <Text
            className={`text-xs font-bold ${
              activeTab === 'recent' ? 'text-white' : 'text-slate-700'
            }`}
          >
            Xem gần đây {recentPackages.length > 0 ? `(${recentPackages.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách thẻ gói khám */}
      {loadingGeneral && activeTab === 'general' ? (
        <ActivityIndicator size="small" color="#047857" className="py-6" />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {displayList.map((pkg: any, idx: number) => {
            const specialtyName =
              pkg.specialty?.name || pkg.specialtyName || pkg.category || 'Tổng quát'
            const price = Number(pkg.price || 1500000)

            return (
              <PackageCard
                key={pkg.id || idx}
                id={String(pkg.id)}
                name={pkg.name}
                description={pkg.description || pkg.desc}
                price={price}
                image={pkg.imageUrl || pkg.image}
                specialtyName={specialtyName}
                badge={
                  activeTab === 'recent'
                    ? {
                        label: 'Gần đây',
                        color: 'text-blue-700',
                        bg: 'bg-blue-50 border-blue-200',
                        icon: 'time-outline',
                      }
                    : {
                        label: pkg.tag || 'TỔNG QUÁT',
                        color: 'text-emerald-700',
                        bg: 'bg-emerald-50 border-emerald-200',
                      }
                }
                onPress={() => {
                  const store = useBookingStore.getState()
                  store.resetBooking()
                  store.setBookingMethod('HEALTH_PACKAGE')
                  store.setHealthPackage({
                    id: String(pkg.id),
                    name: pkg.name,
                    price: price,
                    specialtyId: pkg.specialtyId || pkg.specialty?.id,
                  })
                  router.push('/booking/package')
                }}
                onDetailPress={() => router.push(`/package/${pkg.id || pkg.slug}`)}
              />
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
