import React, { useState } from 'react'
import { Platform, View } from 'react-native'
import { Tabs } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BookingMethodsModal } from '../../src/components/booking/BookingMethodsModal'

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const [bookingModalVisible, setBookingModalVisible] = useState(false)

  const tabHeight = Platform.select({
    ios: 60 + insets.bottom,
    android: 70,
    default: 72, // Web / Desktop
  })

  const paddingBottom = Platform.select({
    ios: Math.max(insets.bottom, 8),
    android: 8,
    default: 8,
  })

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#059669',
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
                color={color}
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
                color={color}
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
              color: '#059669',
              marginBottom: 2,
            },
            tabBarIcon: () => (
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: '#059669',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: -16,
                  borderWidth: 3,
                  borderColor: '#ffffff',
                  shadowColor: '#059669',
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
                color={color}
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
                color={color}
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
