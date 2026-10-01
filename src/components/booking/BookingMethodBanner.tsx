import React from 'react'
import { Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { BookingMethod, METHOD_INFO } from '../../constants/booking'

interface BookingMethodBannerProps {
  method: BookingMethod
}

export const BookingMethodBanner: React.FC<BookingMethodBannerProps> = ({ method }) => {
  const info = METHOD_INFO[method]
  if (!info) return null

  return (
    <View className="mb-5 p-3.5 rounded-lg border border-slate-200/90 bg-slate-50/80 flex-row items-center gap-3">
      <View className={`w-9 h-9 rounded-lg items-center justify-center ${info.bgColor}`}>
        <Ionicons name={info.icon} size={19} color={info.color} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-xs font-bold text-slate-800">{info.title}</Text>
          <View className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200">
            <Text className="text-[9px] font-bold text-emerald-700">{info.badge}</Text>
          </View>
        </View>
        <Text numberOfLines={1} className="text-[11px] text-slate-500 mt-0.5">
          {info.desc}
        </Text>
      </View>
    </View>
  )
}
