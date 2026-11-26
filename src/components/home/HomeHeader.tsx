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
}) => (
  <View className="flex-row items-center justify-between border-b border-slate-100 bg-white px-4 py-4">
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
          className="ml-2 flex-1 text-xl font-black leading-6 tracking-tight text-slate-800"
        >
          Vita<Text className="text-primary-700">Care</Text>
        </Text>
      </View>
      <Text numberOfLines={2} className="mt-2 text-sm font-medium leading-5 text-slate-500">
        Xin chào, {patientName}
      </Text>
    </View>

    <View className="flex-row items-center gap-2">
      <TouchableOpacity
        accessibilityLabel="Thông báo"
        accessibilityRole="button"
        activeOpacity={0.8}
        onPress={onNotificationsPress}
        className="relative h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50"
      >
        <Ionicons name="notifications-outline" size={22} color="#1e293b" />
        {unreadCount > 0 && (
          <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1">
            <Text className="text-[9px] font-extrabold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {!isAuthenticated && (
        <TouchableOpacity
          onPress={onLoginPress}
          className="rounded-lg bg-primary-600 px-3 py-3"
        >
          <Text className="text-sm font-bold text-white">Đăng nhập</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
)