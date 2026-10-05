import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import Ionicons from '@expo/vector-icons/Ionicons'

export interface HeroBannerProps {
  onStartBooking: () => void
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onStartBooking }) => {
  return (
    <View className="px-5 pt-3">
      <View className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-emerald-600 rounded-lg px-4 py-3 shadow-xs relative overflow-hidden">
        <View
          pointerEvents="none"
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10"
        />
        <View
          pointerEvents="none"
          className="absolute -bottom-8 right-24 w-20 h-20 rounded-full bg-teal-300/20"
        />

        <View className="flex-row items-end justify-between">
          <View className="w-24 h-28 items-center justify-end -mb-3 -ml-1 mr-2">
            <Image
              source={require('../../../assets/images/doctor-hero.png')}
              style={{ width: 105, height: 122 }}
              contentFit="contain"
              contentPosition="bottom center"
              transition={200}
            />
          </View>

          <View className="flex-1 pl-1 pb-0.5">
            <Text className="text-white text-[15px] font-black tracking-tight leading-tight">
              Khám bệnh online!
            </Text>
            <Text className="text-emerald-50 text-[11px] mt-1 leading-tight">
              Chủ động chọn bác sĩ & giờ khám không lo xếp hàng chờ đợi
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onStartBooking}
              className="bg-white mt-2 py-1.5 px-3 rounded-md self-start flex-row items-center shadow-xs"
            >
              <Text className="text-emerald-800 font-extrabold text-[11px] mr-1">
                Đặt lịch ngay
              </Text>
              <Ionicons name="arrow-forward" size={12} color="#047857" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}
