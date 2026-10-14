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
    <View className="bg-white px-4 py-4 border-b border-slate-100 flex-row items-center justify-between">
      <View className="flex-1 pr-2" style={{ minWidth: 0 }}>
        <View className="flex-row items-center">
          <Image
            source={require('../../../assets/images/logo-icon.png')}
            style={{ width: 42, height: 42 }}
            contentFit="contain"
            transition={200}
          />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
            className="ml-2 flex-1 text-xl leading-6 font-black text-slate-800 tracking-tight"
          >
            Vita<Text className="text-primary-700">Care</Text>
          </Text>
        </View>
        <Text numberOfLines={2} className="text-sm leading-5 font-medium text-slate-500 mt-2">
          Xin chào, {patientName}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onNotificationsPress}
          className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200/80 items-center justify-center relative shadow-2xs"
        >
          <Ionicons name="notifications-outline" size={22} color="#1e293b" />
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
            className="bg-primary-600 px-3 py-3 rounded-lg shadow-xs"
          >
            <Text className="text-white text-sm font-bold">Đăng nhập</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
