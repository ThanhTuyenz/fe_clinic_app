import { useState } from 'react'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { ZaloLogo } from '../common/ZaloLogo'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../store/useAuthStore'
import { useRouter } from 'expo-router'

interface ZaloLoginModalProps {
  visible: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function ZaloLoginModal({ visible, onClose, onSuccess }: ZaloLoginModalProps) {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  const [phone, setPhone] = useState('0912345678')
  const [name, setName] = useState('Nguyễn Văn An')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleZaloLogin = async () => {
    const cleanPhone = phone.trim()
    if (!cleanPhone) {
      setErrorMessage('Vui lòng nhập số điện thoại Zalo.')
      return
    }

    try {
      setLoading(true)
      setErrorMessage(null)

      // Giả lập Zalo SDK cấp accessToken và quyền đọc số điện thoại
      const res = await authService.loginWithZalo({
        accessToken: `mock_zalo_token_${cleanPhone.replace(/\D/g, '')}`,
        phoneNumber: cleanPhone,
        name: name.trim() || 'Người dùng Zalo',
      })

      if (res.token && res.user) {
        await setAuth(res.token, res.user, res.refreshToken)
        onClose()
        if (onSuccess) {
          onSuccess()
        } else {
          router.replace('/(tabs)')
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Đăng nhập Zalo không thành công.'
      setErrorMessage(msg)
      Alert.alert('Lỗi đăng nhập', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/60 justify-center items-center p-5">
        <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl border border-slate-100">
          <View className="items-center mb-4">
            <View className="w-14 h-14 bg-blue-50 rounded-full items-center justify-center mb-2">
              <ZaloLogo size={32} />
            </View>
            <Text className="text-lg font-bold text-slate-900 text-center">
              Đăng nhập bằng Zalo
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-1">
              Đăng nhập 1 chạm an toàn qua tài khoản Zalo của bạn
            </Text>
          </View>

          {errorMessage && (
            <View className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg mb-4 flex-row items-center">
              <Ionicons name="alert-circle" size={16} color="#e11d48" style={{ marginRight: 6 }} />
              <Text className="text-xs text-rose-700 flex-1">{errorMessage}</Text>
            </View>
          )}

          <View className="mb-4">
            <Text className="text-xs font-semibold text-slate-700 mb-1.5">Số điện thoại Zalo</Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3">
              <Ionicons name="call-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="0912345678"
                keyboardType="phone-pad"
                className="flex-1 text-sm text-slate-900 font-medium"
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-xs font-semibold text-slate-700 mb-1.5">Tên hiển thị</Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3">
              <Ionicons name="person-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Họ và tên"
                className="flex-1 text-sm text-slate-900 font-medium"
              />
            </View>
          </View>

          <TouchableOpacity
            disabled={loading}
            activeOpacity={0.85}
            onPress={handleZaloLogin}
            className="w-full bg-[#0068FF] active:bg-blue-700 py-3.5 rounded-xl items-center justify-center flex-row mb-3 shadow-xs"
          >
            <Ionicons name="shield-checkmark-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text className="shrink text-white text-sm font-bold">Xác nhận đăng nhập Zalo</Text>
            {loading && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />}
          </TouchableOpacity>

          <TouchableOpacity
            disabled={loading}
            activeOpacity={0.7}
            onPress={onClose}
            className="w-full py-2 items-center justify-center"
          >
            <Text className="text-xs text-slate-500 font-medium">Hủy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}
