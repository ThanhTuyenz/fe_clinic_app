import { useState, useEffect } from 'react'
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

interface ZaloLinkModalProps {
  visible: boolean
  phoneNumber: string
  email: string
  fullName: string
  password: string
  zaloUserName?: string | null
  onClose: () => void
  onSuccess?: () => void
}

export function ZaloLinkModal({
  visible,
  phoneNumber,
  email,
  fullName,
  password,
  zaloUserName,
  onClose,
  onSuccess,
}: ZaloLinkModalProps) {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)

  const [step, setStep] = useState<'prompt' | 'otp'>('prompt')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let timer: any = null
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 1 ? prev - 1 : 0))
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [step, countdown])

  const handleRequestOtp = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)
      await authService.requestLinkOtp(phoneNumber)
      setStep('otp')
      setCountdown(60)
    } catch (err: any) {
      const msg = err.message || 'Không thể gửi mã OTP, vui lòng thử lại.'
      setErrorMessage(msg)
      Alert.alert('Lỗi', msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (countdown > 0) return
    try {
      setLoading(true)
      setErrorMessage(null)
      await authService.requestLinkOtp(phoneNumber)
      setCountdown(60)
      Alert.alert('Thành công', 'Mã OTP mới đã được gửi về Zalo của bạn.')
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi lại OTP.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmLink = async () => {
    if (otp.length !== 6) {
      setErrorMessage('Vui lòng nhập đủ 6 chữ số OTP.')
      return
    }
    try {
      setLoading(true)
      setErrorMessage(null)
      const res = await authService.confirmLinkAccount({
        phoneNumber,
        email,
        password,
        fullName: fullName || zaloUserName || undefined,
        otp,
      })

      if (res.token && res.user) {
        await setAuth(res.token, res.user, res.refreshToken)
        onClose()
        if (onSuccess) {
          onSuccess()
        } else {
          Alert.alert('Thành công', 'Đã liên kết Email và đăng nhập thành công!', [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)'),
            },
          ])
        }
      }
    } catch (err: any) {
      const msg = err.message || 'Mã xác thực OTP không chính xác hoặc đã hết hạn.'
      setErrorMessage(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/60 justify-center items-center p-5">
        <View className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl border border-slate-100">
          {/* Header */}
          <View className="items-center mb-4">
            <View className="w-14 h-14 bg-blue-50 rounded-full items-center justify-center mb-3">
              <ZaloLogo size={32} />
            </View>
            <Text className="text-lg font-bold text-slate-900 text-center">
              {step === 'prompt' ? 'Phát hiện tài khoản Zalo' : 'Xác thực OTP Zalo'}
            </Text>
          </View>

          {errorMessage && (
            <View className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg mb-4 flex-row items-center">
              <Ionicons name="alert-circle" size={16} color="#e11d48" style={{ marginRight: 6 }} />
              <Text className="text-xs text-rose-700 flex-1">{errorMessage}</Text>
            </View>
          )}

          {step === 'prompt' ? (
            <View>
              <Text className="text-xs text-slate-600 text-center mb-4 leading-5">
                Số điện thoại <Text className="font-bold text-slate-900">{phoneNumber}</Text> đã có tài
                khoản (qua Zalo)
                {zaloUserName ? (
                  <Text>
                    {' '}
                    của người dùng <Text className="font-bold text-slate-900">{zaloUserName}</Text>
                  </Text>
                ) : null}
                .
              </Text>

              <View className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3.5 mb-5">
                <Text className="text-xs text-blue-900 leading-5">
                  Bạn có muốn liên kết email <Text className="font-semibold">{email}</Text> và mật khẩu
                  này vào tài khoản Zalo hiện tại không?
                </Text>
              </View>

              <TouchableOpacity
                disabled={loading}
                activeOpacity={0.85}
                onPress={handleRequestOtp}
                className="w-full bg-[#0068FF] active:bg-blue-700 py-3.5 rounded-xl items-center justify-center flex-row mb-3 shadow-xs"
              >
                <Ionicons name="link-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text className="shrink text-white text-sm font-bold">Liên kết ngay (Gửi OTP)</Text>
                {loading && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={loading}
                activeOpacity={0.7}
                onPress={onClose}
                className="w-full py-2.5 items-center justify-center"
              >
                <Text className="text-xs text-slate-500 font-medium">Hủy / Dùng số điện thoại khác</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-xs text-slate-600 text-center mb-4 leading-5">
                Mã OTP 6 số đã được gửi qua tin nhắn Zalo đến số{' '}
                <Text className="font-bold text-slate-900">{phoneNumber}</Text>.
              </Text>

              <View className="mb-4">
                <TextInput
                  value={otp}
                  onChangeText={(val) => setOtp(val.replace(/\D/g, '').slice(0, 6))}
                  placeholder="------"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3.5 text-center text-2xl font-bold tracking-widest text-slate-900"
                />
              </View>

              <TouchableOpacity
                disabled={loading || otp.length !== 6}
                activeOpacity={0.85}
                onPress={handleConfirmLink}
                className={`w-full py-3.5 rounded-xl items-center justify-center flex-row mb-3 shadow-xs ${
                  otp.length === 6 ? 'bg-[#0068FF] active:bg-blue-700' : 'bg-slate-300'
                }`}
              >
                <Text className="text-white text-sm font-bold">Xác nhận liên kết</Text>
                {loading && <ActivityIndicator size="small" color="#fff" style={{ marginLeft: 8 }} />}
              </TouchableOpacity>

              {/* Gửi lại OTP */}
              <View className="items-center mt-1">
                {countdown > 0 ? (
                  <Text className="text-xs text-slate-400">
                    Gửi lại mã sau <Text className="font-bold text-slate-600">{countdown}s</Text>
                  </Text>
                ) : (
                  <TouchableOpacity activeOpacity={0.7} onPress={handleResendOtp} disabled={loading}>
                    <Text className="text-xs font-semibold text-[#0068FF]">Gửi lại mã OTP qua Zalo</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  )
}
