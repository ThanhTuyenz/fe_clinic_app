import React from 'react'
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuthStore } from '../../src/store/useAuthStore'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const patientName = user?.full_name || user?.fullName || user?.name || 'Chưa cập nhật'
  const patientPhone = user?.phone || 'Chưa cập nhật SĐT'
  const patientEmail = user?.email || 'Chưa cập nhật email'

  return (
    <ScreenShell title="Hồ sơ cá nhân">
      <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {isAuthenticated ? (
          <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-5 flex-row items-center">
            <View className="w-16 h-16 rounded-2xl bg-sky-100 items-center justify-center mr-4 border border-sky-200">
              <Ionicons name="person" size={30} color="#0284c7" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-800">
                {patientName}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">{patientPhone}</Text>
              <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
                {patientEmail}
              </Text>
            </View>
          </View>
        ) : (
          <View className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-5 items-center">
            <Text className="text-base font-bold text-slate-800 mb-1">
              Chưa đăng nhập
            </Text>
            <Text className="text-xs text-slate-500 text-center mb-4">
              Đăng nhập để xem hồ sơ bệnh án và lịch sử khám bệnh cá nhân
            </Text>
            <Button
              title="Đăng nhập / Đăng ký"
              size="sm"
              onPress={() => router.push('/(auth)/login')}
              className="w-48"
            />
          </View>
        )}

        {/* Menu Items */}
        <View className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/appointments')}
            className="flex-row items-center p-4 border-b border-slate-100 active:bg-slate-50"
          >
            <View className="w-8 h-8 rounded-xl bg-sky-50 items-center justify-center mr-3">
              <Ionicons name="calendar-outline" size={18} color="#0284c7" />
            </View>
            <Text className="text-sm font-semibold text-slate-800 flex-1">
              Lịch khám của tôi
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/ai-chat')}
            className="flex-row items-center p-4 border-b border-slate-100 active:bg-slate-50"
          >
            <View className="w-8 h-8 rounded-xl bg-teal-50 items-center justify-center mr-3">
              <Ionicons name="sparkles-outline" size={18} color="#0d9488" />
            </View>
            <Text className="text-sm font-semibold text-slate-800 flex-1">
              Trợ lý tư vấn AI
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/notifications')}
            className="flex-row items-center p-4 active:bg-slate-50"
          >
            <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center mr-3">
              <Ionicons name="notifications-outline" size={18} color="#d97706" />
            </View>
            <Text className="text-sm font-semibold text-slate-800 flex-1">
              Cài đặt thông báo
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Hỗ trợ & Thông tin chung */}
        <View className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-6">
          <TouchableOpacity
            onPress={() =>
              Alert.alert('Tổng đài hỗ trợ', 'Hotline CSKH: 1900 1234 (24/7)')
            }
            className="flex-row items-center p-4 border-b border-slate-100 active:bg-slate-50"
          >
            <View className="w-8 h-8 rounded-xl bg-slate-50 items-center justify-center mr-3">
              <Ionicons name="call-outline" size={18} color="#64748b" />
            </View>
            <Text className="text-sm font-semibold text-slate-800 flex-1">
              Tổng đài phòng khám (1900 1234)
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'VitaCare Clinic',
                'Phiên bản ứng dụng: 2.0.0 (Expo Router & NativeWind)'
              )
            }
            className="flex-row items-center p-4 active:bg-slate-50"
          >
            <View className="w-8 h-8 rounded-xl bg-slate-50 items-center justify-center mr-3">
              <Ionicons name="information-circle-outline" size={18} color="#64748b" />
            </View>
            <Text className="text-sm font-semibold text-slate-800 flex-1">
              Thông tin ứng dụng
            </Text>
            <Text className="text-xs text-slate-400">v2.0.0</Text>
          </TouchableOpacity>
        </View>

        {/* Nút Đăng xuất */}
        {isAuthenticated && (
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-50 border border-red-200 py-3.5 rounded-2xl items-center justify-center mb-8"
          >
            <Text className="text-red-600 font-bold text-sm">Đăng xuất</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </ScreenShell>
  )
}
