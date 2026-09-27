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
import { authService } from '../../src/services/authService'
import { useAuthStore } from '../../src/store/useAuthStore'
import { Input } from '../../src/components/common/Input'
import { Button } from '../../src/components/common/Button'
import { ScreenShell } from '../../src/components/common/ScreenShell'

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

  const isReset = params.isResetPassword === '1'

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
          verificationToken: params.verificationToken || '',
          otp: otp.trim(),
          newPassword,
        })
        Alert.alert('Thành công', 'Đổi mật khẩu thành công! Vui lòng đăng nhập lại.')
        router.replace('/(auth)/login')
      } else {
        // Hoàn tất đăng ký
        const verifyRes = await authService.verifyEmail({
          verificationToken: params.verificationToken || '',
          otp: otp.trim(),
        })

        const completeRes = await authService.completeRegister({
          completeToken: verifyRes.completeToken || '',
          firstName: params.firstName || 'Nguyễn',
          lastName: params.lastName || 'Văn A',
          phone: params.phone || '',
          password: params.password || '',
        })

        if (completeRes.token && completeRes.user) {
          await setAuth(completeRes.token, completeRes.user)
          Alert.alert('Thành công', 'Đăng ký tài khoản thành công!')
          router.replace('/(tabs)')
        } else {
          router.replace('/(auth)/login')
        }
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
        className="flex-1"
      >
        <ScrollView className="px-6 py-8" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-full bg-teal-50 items-center justify-center mb-3">
              <Ionicons name="chatbox-ellipses-outline" size={32} color="#0d9488" />
            </View>
            <Text className="text-2xl font-bold text-slate-800">
              Nhập mã xác thực
            </Text>
            <Text className="text-sm text-slate-500 text-center mt-2 px-2">
              Mã xác thực gồm 6 chữ số đã được gửi tới số điện thoại / email của bạn.
            </Text>
          </View>

          <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
