import React from 'react'
import { FlatList, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { ScreenShell } from '../../src/components/common/ScreenShell'

interface MockNotification {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  type: 'reminder' | 'system' | 'promotion'
}

const NOTIFICATIONS: MockNotification[] = [
  {
    id: '1',
    title: 'Nhắc nhở lịch khám ngày mai',
    body: 'Bạn có lịch khám chuyên khoa Nội lúc 08:30 ngày mai. Vui lòng đến sớm 15 phút tại sảnh A.',
    time: '2 giờ trước',
    read: false,
    type: 'reminder',
  },
  {
    id: '2',
    title: 'Lịch khám đã được xác nhận',
    body: 'Bác sĩ đã xác nhận phiếu khám mã #VC-8921. Bạn có thể xem chi tiết vé khám trong mục Lịch hẹn.',
    time: '1 ngày trước',
    read: true,
    type: 'reminder',
  },
  {
    id: '3',
    title: 'Chào mừng bạn đến với VitaCare Clinic',
    body: 'Cảm ơn bạn đã lựa chọn nền tảng y tế số VitaCare Clinic để chăm sóc sức khỏe cho gia đình.',
    time: '3 ngày trước',
    read: true,
    type: 'system',
  },
]

export default function NotificationsScreen() {
  const router = useRouter()

  const renderItem = ({ item }: { item: MockNotification }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/(tabs)/appointments')}
        className={`p-4 rounded-2xl mb-3 border ${
          item.read
            ? 'bg-white border-slate-100'
            : 'bg-sky-50/50 border-sky-200 shadow-xs'
        }`}
      >
        <View className="flex-row items-start">
          <View
            className={`w-9 h-9 rounded-full items-center justify-center mr-3 mt-0.5 ${
              item.type === 'reminder'
                ? 'bg-amber-100'
                : 'bg-sky-100'
            }`}
          >
            <Ionicons
              name={item.type === 'reminder' ? 'time' : 'notifications'}
              size={18}
              color={item.type === 'reminder' ? '#d97706' : '#0284c7'}
            />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                className={`text-sm ${
                  item.read ? 'font-semibold text-slate-800' : 'font-bold text-sky-900'
                }`}
              >
                {item.title}
              </Text>
              <Text className="text-[10px] text-slate-400">{item.time}</Text>
            </View>
            <Text className="text-xs text-slate-600 leading-relaxed">
              {item.body}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <ScreenShell title="Thông báo">
      <View className="flex-1 px-5 pt-3">
        <FlatList
          data={NOTIFICATIONS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </ScreenShell>
  )
}
