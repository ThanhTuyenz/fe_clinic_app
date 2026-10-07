import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import Ionicons from '@expo/vector-icons/Ionicons'

export interface HomeHeaderProps {
  patientName: string
  isAuthenticated: boolean
  unreadCount?: number
  onNotificationsPress: () => void
  onAiChatPress?: () => void
  onLoginPress: () => void
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  patientName,
  isAuthenticated,
  unreadCount = 0,
  onNotificationsPress,
  onLoginPress,
}) => {
  return (
    <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100 flex-row items-center justify-between">
      <View className="flex-1 pr-3">
        <View className="flex-row items-center">
          <Image
            source={require('../../../assets/images/logo-icon.png')}
            style={{ width: 32, height: 32 }}
            contentFit="contain"
            transition={200}
          />
          <View className="ml-2 flex-row items-baseline">
            <Text className="text-base font-black text-slate-800 tracking-tight">
              Vita<Text className="text-emerald-700">Care</Text>
            </Text>
            <Text className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase ml-1.5">
              CLINIC
            </Text>
          </View>
        </View>
        <Text numberOfLines={1} className="text-xs font-medium text-slate-500 mt-1">
          Xin chào, {patientName}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onNotificationsPress}
          className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 items-center justify-center relative shadow-2xs"
        >
          <Ionicons name="notifications-outline" size={20} color="#1e293b" />
          {unreadCount > 0 ? (
            <View className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 absolute -top-1 -right-1 items-center justify-center border-2 border-white shadow-xs">
              <Text className="text-[9px] font-extrabold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {!isAuthenticated && (
          <TouchableOpacity
            onPress={onLoginPress}
            className="bg-emerald-600 px-3.5 py-2 rounded-lg ml-1 shadow-xs"
          >
            <Text className="text-white text-xs font-bold">Đăng nhập</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
