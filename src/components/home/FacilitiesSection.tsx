import React from 'react'
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import Ionicons from '@expo/vector-icons/Ionicons'

export interface FacilityItem {
  id: string
  name: string
  address: string
  phone: string
  tag: string
  rating: string
  img: string
}

export const FACILITIES: FacilityItem[] = [
  {
    id: 'branch-1',
    name: 'VitaCare Clinic - Cơ sở Quận 1',
    address: '85 Cách Mạng Tháng 8, P. Bến Thành, Quận 1, TP.HCM',
    phone: '1900 1234 (Ext 1)',
    tag: 'TRỤ SỞ CHÍNH',
    rating: '5.0',
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'branch-2',
    name: 'VitaCare Clinic - Cơ sở Cầu Giấy',
    address: '120 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    phone: '1900 1234 (Ext 2)',
    tag: 'CÔNG NGHỆ CAO',
    rating: '4.9',
    img: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'branch-3',
    name: 'VitaCare Clinic - Cơ sở Đà Nẵng',
    address: '15 Lê Lợi, P. Thạch Thang, Q. Hải Châu, Đà Nẵng',
    phone: '1900 1234 (Ext 3)',
    tag: 'ĐA KHOA QUỐC TẾ',
    rating: '4.9',
    img: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80',
  },
]

export interface FacilitiesSectionProps {
  onStartBooking: () => void
}

export const FacilitiesSection: React.FC<FacilitiesSectionProps> = ({ onStartBooking }) => {
  return (
    <View className="mt-8 pt-2" style={{ marginTop: 32 }}>
      <View className="px-5 flex-row items-center justify-between mb-3.5">
        <View className="flex-1 mr-2">
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Cơ sở y tế nổi bật
          </Text>
          <Text className="text-[11px] text-slate-400 mt-0.5">
            Phòng khám chuẩn quốc tế
          </Text>
        </View>
        <TouchableOpacity
          onPress={() =>
            Alert.alert(
              'Hệ thống cơ sở',
              'VitaCare hiện có 3 cơ sở chính tại TP.HCM, Hà Nội và Đà Nẵng.'
            )
          }
        >
          <Text className="text-xs font-semibold text-emerald-600">Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      >
        {FACILITIES.map((facility) => (
          <View
            key={facility.id}
            className="w-64 bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden mr-3.5"
            style={{ width: 256 }}
          >
            <View className="h-32 relative bg-slate-100">
              <Image
                source={{ uri: facility.img }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
              <View className="absolute top-2.5 left-2.5 bg-emerald-700 px-2 py-0.5 rounded-lg shadow-xs">
                <Text className="text-white text-[9px] font-bold uppercase tracking-wider">
                  {facility.tag}
                </Text>
              </View>
              <View className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded-lg flex-row items-center">
                <Ionicons name="star" size={11} color="#f59e0b" />
                <Text className="text-white text-[10px] font-bold ml-1">{facility.rating}</Text>
              </View>
            </View>

            <View className="p-3.5">
              <Text numberOfLines={1} className="text-sm font-bold text-slate-900">
                {facility.name}
              </Text>
              <View className="flex-row items-start mt-1.5">
                <Ionicons
                  name="location-outline"
                  size={13}
                  color="#059669"
                  style={{ marginTop: 1, marginRight: 4 }}
                />
                <Text numberOfLines={2} className="text-xs text-slate-500 flex-1 leading-snug">
                  {facility.address}
                </Text>
              </View>
              <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                <Text className="text-[11px] text-emerald-700 font-semibold">{facility.phone}</Text>
                <TouchableOpacity
                  onPress={onStartBooking}
                  className="bg-emerald-50 border border-emerald-600 px-2.5 py-1 rounded-lg"
                >
                  <Text className="text-[10px] font-bold text-emerald-700">Đặt khám</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}
