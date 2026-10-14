import React from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { doctorService } from '../../services/doctorService'
import { useBookingStore } from '../../store/useBookingStore'
import { PackageCard } from './PackageCard'

export const SpecialtiesGridSection: React.FC = () => {
  const router = useRouter()

  const { data: specialtyPackages = [], isLoading: loadingPkgs } = useQuery({
    queryKey: ['specialtyPackages'],
    queryFn: () => doctorService.getSpecialtyPackages(),
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
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8, alignItems: 'flex-start' }}
        >
          {(specialtyPackages.length > 0 ? specialtyPackages : displayFallbackPackages).map(
            (pkg: any, idx: number) => (
              <PackageCard
                key={pkg.id || idx}
                id={String(pkg.id)}
                name={pkg.name}
                description={pkg.description || pkg.desc}
                price={Number(pkg.price || 1200000)}
                image={pkg.imageUrl || pkg.image}
                specialtyName={pkg.specialty?.name || pkg.specialtyName || 'Chuyên khoa'}
                onPress={() => {
                  const store = useBookingStore.getState()
                  store.resetBooking()
                  store.setBookingMethod('HEALTH_PACKAGE')
                  store.setHealthPackage({
                    id: String(pkg.id),
                    name: pkg.name,
                    price: Number(pkg.price || 1200000),
                    specialtyId: pkg.specialtyId || pkg.specialty?.id,
                  })
                  router.push('/booking/package')
                }}
                onDetailPress={() => router.push(`/package/${pkg.id || pkg.slug}`)}
              />
            )
          )}
        </ScrollView>
      )}
    </View>
  )
}

const displayFallbackPackages = [
  {
    id: 'sp-1',
    name: 'Tầm soát & Chẩn đoán Tim mạch Toàn diện',
    desc: 'Đo điện tâm đồ ECG, siêu âm tim Doppler và đánh giá xơ vữa động mạch',
    price: 1850000,
    specialtyName: 'Tim mạch',
    image: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sp-2',
    name: 'Khám & Tầm soát Tiêu hóa - Gan Mật',
    desc: 'Siêu âm ổ bụng tổng quát, kiểm tra men gan và tầm soát viêm dạ dày',
    price: 1600000,
    specialtyName: 'Tiêu hóa',
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'sp-3',
    name: 'Tầm soát Thoái hóa Cơ Xương Khớp & Cột sống',
    desc: 'Chụp X-quang kỹ thuật số, định lượng Axit Uric và tư vấn phục hồi chức năng',
    price: 1350000,
    specialtyName: 'Cơ Xương Khớp',
    image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&auto=format&fit=crop&q=80',
  },
]

