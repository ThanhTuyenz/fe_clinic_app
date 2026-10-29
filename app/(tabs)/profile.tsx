import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuthStore } from '../../src/store/useAuthStore'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'
import { api } from '../../src/services/api'

export default function ProfileScreen() {
  const router = useRouter()
  const { user, isAuthenticated, logout } = useAuthStore()
  const appVersion = Constants.expoConfig?.version || 'Đang cập nhật'

  const [logoutModalVisible, setLogoutModalVisible] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleConfirmLogout = async () => {
    try {
      setLoggingOut(true)
      // Thông báo cho backend dọn session & blacklist token
      await api.post('/api/v1/auth/logout').catch(() => {})
      // Xoá sạch AsyncStorage và reset Zustand auth state
      await logout()
      setLogoutModalVisible(false)
      router.replace('/(auth)/login')
    } catch {
      await logout()
      setLogoutModalVisible(false)
      router.replace('/(auth)/login')
    } finally {
      setLoggingOut(false)
    }
  }

  const patientName = user?.full_name || user?.fullName || user?.name || 'Chưa cập nhật'
  const patientPhone = user?.phone || 'Chưa cập nhật SĐT'
  const patientEmail = user?.email || 'Chưa cập nhật email'

  return (
    <ScreenShell title="Hồ sơ cá nhân">
      <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
        {/* User Card */}
        {isAuthenticated ? (
          <View className="bg-white p-5 rounded-lg border border-slate-200/90 mb-4 flex-row items-center">
            <View className="w-16 h-16 rounded-lg bg-primary-50 items-center justify-center mr-4 border border-primary-100">
              <Ionicons name="person-outline" size={30} color="#28a745" />
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
          <View className="bg-white p-6 rounded-lg border border-slate-200/90 mb-4 items-center">
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
        <View className="bg-white rounded-lg border border-slate-200/90 overflow-hidden mb-4">
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/records')}
            className="flex-row items-center p-4 border-b border-slate-100 active:bg-slate-50"
          >
            <View className="w-8 h-8 rounded-lg bg-blue-50 items-center justify-center mr-3">
              <Ionicons name="people-outline" size={18} color="#2563eb" />
            </View>
            <Text className="text-sm font-semibold text-slate-800 flex-1">
              Hồ sơ người khám & Gia đình
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/appointments')}
            className="flex-row items-center p-4 border-b border-slate-100 active:bg-slate-50"
          >
            <View className="w-8 h-8 rounded-lg bg-primary-50 items-center justify-center mr-3">
              <Ionicons name="calendar-outline" size={18} color="#28a745" />
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
            <View className="w-8 h-8 rounded-lg bg-teal-50 items-center justify-center mr-3">
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
            <View className="w-8 h-8 rounded-lg bg-amber-50 items-center justify-center mr-3">
              <Ionicons name="notifications-outline" size={18} color="#d97706" />
            </View>
            <Text className="text-sm font-semibold text-slate-800 flex-1">
              Cài đặt thông báo
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Hỗ trợ & Thông tin chung */}
        <View className="bg-white rounded-lg border border-slate-200/90 overflow-hidden mb-5">
          <TouchableOpacity
            onPress={() => router.push('/facilities')}
            className="flex-row items-center p-4 border-b border-slate-100 active:bg-slate-50"
          >
            <View className="w-8 h-8 rounded-lg bg-slate-50 items-center justify-center mr-3">
              <Ionicons name="call-outline" size={18} color="#64748b" />
            </View>
            <Text className="text-sm font-semibold text-slate-800 flex-1">
              Liên hệ cơ sở phòng khám
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'VitaCare Clinic',
                `Phiên bản ứng dụng: ${appVersion}`
              )
            }
            className="flex-row items-center p-4 active:bg-slate-50"
          >
            <View className="w-8 h-8 rounded-lg bg-slate-50 items-center justify-center mr-3">
              <Ionicons name="information-circle-outline" size={18} color="#64748b" />
            </View>
            <Text className="text-sm font-semibold text-slate-800 flex-1">
              Thông tin ứng dụng
            </Text>
            <Text className="text-xs text-slate-400">{appVersion}</Text>
          </TouchableOpacity>
        </View>

        {/* Nút Đăng xuất */}
        {isAuthenticated && (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setLogoutModalVisible(true)}
            className="bg-rose-50 border border-rose-200 py-3.5 rounded-lg items-center justify-center mb-8 flex-row active:bg-rose-100"
          >
            <Ionicons name="log-out-outline" size={18} color="#e11d48" className="mr-2" />
            <Text className="text-rose-700 font-bold text-sm ml-1.5">Đăng xuất</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal Xác nhận Đăng xuất hoạt động mượt mà 100% trên Web, iOS và Android */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loggingOut) setLogoutModalVisible(false)
        }}
      >
        <View
          className="flex-1 items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
        >
          <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-slate-100">
            <View className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 items-center justify-center mb-4 self-center">
              <Ionicons name="log-out-outline" size={24} color="#e11d48" />
            </View>

            <Text className="text-base font-bold text-slate-800 text-center mb-1">
              Đăng xuất tài khoản?
            </Text>
            <Text className="text-xs text-slate-500 text-center leading-relaxed mb-6">
              Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng VitaCare Clinic trên thiết bị này không?
            </Text>

            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                disabled={loggingOut}
                onPress={() => setLogoutModalVisible(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 items-center active:bg-slate-50"
              >
                <Text className="text-xs font-bold text-slate-700">Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={loggingOut}
                onPress={handleConfirmLogout}
                className="flex-1 flex-row gap-2 py-3 rounded-xl bg-rose-600 active:bg-rose-700 items-center justify-center shadow-xs"
              >
                <Text className="text-xs font-bold text-white">Đăng xuất</Text>
                {loggingOut && <ActivityIndicator size="small" color="#ffffff" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  )
}
