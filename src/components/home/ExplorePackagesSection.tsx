import React, { useCallback, useState } from 'react'
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { clinicHomepageQuery } from '../../queries/homeQueries'
import { PackageCard } from './PackageCard'
import { RECENTLY_VIEWED_KEY, type RecentlyViewedPackage } from '../../utils/recentlyViewedPackages'

export const ExplorePackagesSection: React.FC = React.memo(() => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'general' | 'recent'>('general')
  const [recentPackages, setRecentPackages] = useState<RecentlyViewedPackage[]>([])

  const { data: generalPackages = [], isLoading: loadingGeneral, isError, refetch } = useQuery({
    ...clinicHomepageQuery,
    select: data => data.healthPackages,
  })

  // Load recently viewed packages from AsyncStorage
  useFocusEffect(useCallback(() => {
    if (activeTab !== 'recent') return
    let active = true
    const loadRecents = async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY)
        const list = raw ? JSON.parse(raw) : []
        if (active) setRecentPackages(Array.isArray(list) ? list.slice(0, 10) : [])
      } catch {}
    }
    void loadRecents()
    return () => { active = false }
  }, [activeTab]))

  const displayList = activeTab === 'general' ? generalPackages : recentPackages

  return (
    <View className="mt-8 pt-1">
      {/* Header Gói khám nổi bật */}
      <View className="px-5 flex-row items-center justify-between mb-5">
        <View className="flex-1 mr-2">
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Gói khám nổi bật
          </Text>
          <Text className="text-sm leading-5 text-slate-500 mt-2">
            Tầm soát định kỳ toàn diện
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/services')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xs font-semibold text-primary-700">Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs chuyển đổi: "Tổng quát" | "Xem gần đây" */}
      <View className="px-5 flex-row items-center gap-2 mb-6">
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
        <ActivityIndicator size="small" color="#28a745" className="py-6" />
      ) : isError && activeTab === 'general' ? (
        <TouchableOpacity onPress={() => { void refetch() }}><Text className="px-5 py-4 text-rose-700">Không tải được gói khám. Nhấn để thử lại.</Text></TouchableOpacity>
      ) : displayList.length === 0 ? (
        <Text className="px-5 py-4 text-sm text-slate-500">{activeTab === 'recent' ? 'Bạn chưa xem gói khám nào.' : 'Chưa có gói khám.'}</Text>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, alignItems: 'flex-start' }}
          data={displayList}
          keyExtractor={pkg => String(pkg.id)}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={3}
          renderItem={({ item: pkg }) => {
            const specialtyName =
              pkg.specialty?.name || pkg.specialtyName || pkg.category || 'Tổng quát'
            const price = Number(pkg.price ?? 0)

            return (
              <PackageCard
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
                        color: 'text-primary-700',
                        bg: 'bg-primary-50 border-primary-200',
                      }
                }
                onPress={() => {
                  router.push({ pathname: '/package/[id]', params: { id: String(pkg.id) } })
                }}
                onDetailPress={() => router.push(`/package/${pkg.id || pkg.slug}`)}
              />
            )
          }}
        />
      )}
    </View>
  )
})
