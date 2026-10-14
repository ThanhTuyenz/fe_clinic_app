import { useState } from 'react'
import { View } from 'react-native'
import { Tabs } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BookingMethodsModal } from '../../src/components/booking/BookingMethodsModal'

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const [bookingModalVisible, setBookingModalVisible] = useState(false)

  const paddingBottom = Math.max(insets.bottom, 8)
  const tabHeight = 64 + paddingBottom

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#28a745',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#f1f5f9',
            borderTopWidth: 1,
            height: tabHeight,
            paddingTop: 6,
            paddingBottom: paddingBottom,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
            marginBottom: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Trang chủ',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={22}
                color={String(color)}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="appointments"
          options={{
            title: 'Lịch hẹn',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={22}
                color={String(color)}
              />
            ),
          }}
        />

        {/* Nút Đặt lịch trung tâm mở Modal phương thức đặt lịch */}
        <Tabs.Screen
          name="booking-action"
          listeners={{
            tabPress: (e) => {
              e.preventDefault()
              setBookingModalVisible(true)
            },
          }}
          options={{
            title: 'Đặt lịch',
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '800',
              color: '#28a745',
              marginBottom: 2,
            },
            tabBarIcon: () => (
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: '#28a745',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -16,
                  borderWidth: 3,
                  borderColor: '#ffffff',
                  shadowColor: '#28a745',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.35,
                  shadowRadius: 6,
                  elevation: 6,
                }}
              >
                <Ionicons name="calendar" size={21} color="#ffffff" />
              </View>
            ),
          }}
        />

        {/* Ẩn ai-chat khỏi danh sách 5 tab chính nhưng vẫn giữ route hợp lệ */}
        <Tabs.Screen
          name="ai-chat"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="records"
          options={{
            title: 'Hồ sơ',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'document-text' : 'document-text-outline'}
                size={22}
                color={String(color)}
              />
            ),
          }}
        />

        {/* Giữ route notifications hoạt động qua icon chuông ở Header */}
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Cá nhân',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={22}
                color={String(color)}
              />
            ),
          }}
        />
      </Tabs>

      {/* Modal Phương thức Đặt lịch khám hiện đại */}
      <BookingMethodsModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
      />
    </>
  )
}
