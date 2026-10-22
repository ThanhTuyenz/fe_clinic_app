import React from 'react'
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { clinicHomepageQuery } from '../../queries/homeQueries'
import { PackageCard } from './PackageCard'

export const SpecialtiesGridSection: React.FC = React.memo(() => {
  const router = useRouter()

  const { data: specialtyPackages = [], isLoading: loadingPkgs, isError, refetch } = useQuery({
    ...clinicHomepageQuery,
    select: data => data.specialtyPackages,
  })

  return (
    <View className="mt-8 pt-1">
      {/* Header Gói khám chuyên khoa */}
      <View className="px-5 flex-row items-center justify-between mb-6">
        <View className="flex-1 mr-2">
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Gói khám chuyên khoa
          </Text>
          <Text className="text-sm leading-5 text-slate-500 mt-2">
            Thăm khám chuyên sâu
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/services')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text className="text-xs font-semibold text-primary-700">Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách Gói khám chuyên khoa cuộn ngang */}
      {loadingPkgs ? (
        <ActivityIndicator size="small" color="#28a745" className="py-4" />
      ) : isError ? (
        <TouchableOpacity onPress={() => { void refetch() }}><Text className="px-5 py-4 text-rose-700">Không tải được gói khám. Nhấn để thử lại.</Text></TouchableOpacity>
      ) : specialtyPackages.length === 0 ? (
        <Text className="px-5 py-4 text-sm text-slate-500">Chưa có gói khám chuyên khoa.</Text>
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, alignItems: 'flex-start' }}
          data={specialtyPackages}
          keyExtractor={pkg => String(pkg.id)}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          windowSize={3}
          renderItem={({ item: pkg }) => (
              <PackageCard
                id={String(pkg.id)}
                name={pkg.name}
                description={pkg.description || pkg.desc}
                price={Number(pkg.price ?? 0)}
                image={pkg.imageUrl || pkg.image}
                specialtyName={pkg.specialty?.name || pkg.specialtyName || 'Chuyên khoa'}
                onPress={() => {
                  router.push({ pathname: '/package/[id]', params: { id: String(pkg.id) } })
                }}
                onDetailPress={() => router.push(`/package/${pkg.id || pkg.slug}`)}
              />
          )}
        />
      )}
    </View>
  )
})
