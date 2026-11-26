import React from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

export interface HomeQuickActionsProps {
  onBookAtFacility: () => void
  onVideoConsultation: () => void
  onHealthPackages: () => void
  onAfterHoursBooking: () => void
  onBookingHistory: () => void
}

const actions = [
  {
    handler: 'onBookAtFacility',
    label: 'Đặt khám tại cơ sở',
    icon: 'business-outline',
    backgroundColor: '#DCFCE7',
    iconColor: '#166534',
  },
  {
    handler: 'onVideoConsultation',
    label: 'Gọi video với bác sĩ',
    icon: 'videocam-outline',
    backgroundColor: '#DBEAFE',
    iconColor: '#1D4ED8',
  },
  {
    handler: 'onHealthPackages',
    label: 'Gói khám sức khỏe',
    icon: 'heart-outline',
    backgroundColor: '#FCE7F3',
    iconColor: '#BE185D',
  },
  {
    handler: 'onAfterHoursBooking',
    label: 'Đặt khám ngoài giờ',
    icon: 'time-outline',
    backgroundColor: '#FEF3C7',
    iconColor: '#92400E',
  },
  {
    handler: 'onBookingHistory',
    label: 'Lịch sử đặt khám',
    icon: 'calendar-outline',
    backgroundColor: '#EDE9FE',
    iconColor: '#6D28D9',
  },
  {
    handler: 'onBookingGuide',
    label: 'Hướng dẫn đặt khám',
    icon: 'book-outline',
    backgroundColor: '#CCFBF1',
    iconColor: '#115E59',
  },
] as const satisfies ReadonlyArray<{
  handler: keyof HomeQuickActionsProps | 'onBookingGuide'
  label: string
  icon: React.ComponentProps<typeof Ionicons>['name']
  backgroundColor: string
  iconColor: string
}>

export function HomeQuickActions(props: HomeQuickActionsProps) {
  const actionHandlers = {
    ...props,
    onBookingGuide: () => {
      Alert.alert(
        'Hướng dẫn đặt khám',
        '1. Chọn phương thức đặt lịch phù hợp.\n\n' +
          '2. Chọn ngày và giờ khám theo các lựa chọn hiển thị.\n\n' +
          '3. Kiểm tra thông tin người khám và xác nhận lịch hẹn.',
        [
          { text: 'Đóng', style: 'cancel' },
          { text: 'Đặt khám', onPress: props.onBookAtFacility },
        ],
      )
    },
  }

  return (
    <View className="mx-4 my-3 rounded-2xl border-2 border-emerald-500 bg-white px-3 pb-2 pt-4 shadow-sm">
      <Text
        accessibilityRole="header"
        className="mb-2 px-1 text-lg font-extrabold text-green-900"
      >
        Chức năng
      </Text>

      <View className="flex-row flex-wrap justify-center">
        {actions.map(({ handler, label, icon, backgroundColor, iconColor }) => (
          <Pressable
            key={handler}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={actionHandlers[handler]}
            className="w-1/3 items-center rounded-xl px-1 py-2"
            style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
          >
            <View
              className="h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor }}
            >
              <Ionicons name={icon} size={25} color={iconColor} />
            </View>
            <Text className="mt-2 text-center text-sm font-semibold leading-5 text-slate-800">
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
