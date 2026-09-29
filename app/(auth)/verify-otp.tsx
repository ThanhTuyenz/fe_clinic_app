import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { authService } from '@/services'
import { useAuthStore } from '@/store/useAuthStore'
import { Button, Input, ScreenShell } from '@/components/common'

export default function VerifyOtpScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    verificationToken?: string
    phone?: string
    firstName?: string
    lastName?: string
    password?: string
    email?: string
    isResetPassword?: string
  }>()

  const setAuth = useAuthStore((state) => state.setAuth)
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(60)

  const isReset = params.isResetPassword === '1'
  const isPhone = Boolean(params.phone && !params.email)
  const displayTarget = params.phone || params.email || ''

  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleResend = async () => {
    if (cooldown > 0 || resending) return
    try {
      setResending(true)
      const targetEmail = params.email || params.phone || ''
      await authService.resendOtp({ email: targetEmail })
      setCooldown(60)
      Alert.alert(
        'Đã gửi lại OTP',
        isPhone
          ? `Mã OTP mới đã được gửi qua ứng dụng Zalo tới số ${displayTarget}.`
          : `Mã OTP mới đã được gửi tới email ${displayTarget}.`
      )
    } catch (err: any) {
      Alert.alert('Gửi lại thất bại', err.message || 'Vui lòng thử lại sau.')
    } finally {
      setResending(false)
    }
  }

  const handleVerify = async () => {
    if (!otp.trim() || otp.trim().length < 4) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mã OTP.')
      return
    }

    try {
      setLoading(true)
      if (isReset) {
        if (!newPassword || newPassword.length < 6) {
          Alert.alert('Lỗi', 'Mật khẩu mới phải có tối thiểu 6 ký tự.')
          return
        }
        await authService.resetPassword({
          hash: otp.trim(),
          password: newPassword,
        })
        Alert.alert('Thành công', 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.')
        router.replace('/(auth)/login')
      } else {
        const targetEmail = params.email || params.phone || ''
        await authService.verifyOtp({
          email: targetEmail,
          otp: otp.trim(),
        })

        if (params.password) {
          try {
            const loginRes = await authService.login({
              email: targetEmail,
              password: params.password,
            })
            if (loginRes.token && loginRes.user) {
              await setAuth(loginRes.token, loginRes.user, loginRes.refreshToken)
              Alert.alert('Thành công', 'Đăng ký và kích hoạt tài khoản thành công!')
              router.replace('/(tabs)')
              return
            }
          } catch {
            // Chuyển sang trang đăng nhập nếu login tự động gặp lỗi
          }
        }

        Alert.alert('Thành công', 'Xác thực tài khoản thành công! Vui lòng đăng nhập.')
        router.replace('/(auth)/login')
      }
    } catch (err: any) {
      Alert.alert('Xác thực thất bại', err.message || 'Mã OTP không đúng hoặc đã hết hạn.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell showBackButton title="Xác thực OTP">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView className="px-6 py-8" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="chatbox-ellipses-outline" size={30} color="#0f172a" />
            </View>
            <Text className="text-xl font-bold text-slate-900 tracking-tight">
              Nhập mã xác thực
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-2 px-4 leading-relaxed">
              {isPhone
                ? `Mã xác thực gồm 6 chữ số đã được gửi qua ứng dụng Zalo tới số điện thoại ${displayTarget}.`
                : `Mã xác thực gồm 6 chữ số đã được gửi tới ${displayTarget}.`}
            </Text>
          </View>

          <View className="bg-white p-5 rounded-lg border border-slate-200/90 shadow-2xs mb-6">
            <Input
              label="Mã OTP *"
              placeholder="VD: 123456"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              className="text-center text-xl tracking-widest font-bold"
            />

            {isReset && (
              <Input
                label="Mật khẩu mới *"
                placeholder="Tối thiểu 6 ký tự"
                isPassword
                value={newPassword}
                onChangeText={setNewPassword}
              />
            )}

            <Button
              title="Xác nhận"
              size="lg"
              isLoading={loading}
              onPress={handleVerify}
              className="mt-3"
            />

            {/* Nút gửi lại OTP với Cooldown 60s */}
            <View className="items-center mt-4 pt-3 border-t border-slate-100">
              <TouchableOpacity
                disabled={cooldown > 0 || resending}
                onPress={handleResend}
                activeOpacity={0.7}
              >
                <Text
                  className={`text-xs font-semibold ${
                    cooldown > 0 || resending ? 'text-slate-400' : 'text-slate-900'
                  }`}
                >
                  {resending
                    ? 'Đang gửi lại...'
                    : cooldown > 0
                      ? `Gửi lại mã qua Zalo sau (${cooldown}s)`
                      : 'Chưa nhận được mã? Gửi lại mã OTP qua Zalo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
