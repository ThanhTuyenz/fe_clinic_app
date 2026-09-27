import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { authService } from '../../src/services/authService'
import { Input } from '../../src/components/common/Input'
import { Button } from '../../src/components/common/Button'
import { ScreenShell } from '../../src/components/common/ScreenShell'

export default function ForgotPasswordScreen() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hoặc số điện thoại.')
      return
    }

    try {
      setLoading(true)
      const res = await authService.startForgotPassword({ email: email.trim() })
      Alert.alert(
        'Thành công',
        res.message || 'Mã xác thực OTP đã được gửi đến email/số điện thoại của bạn.'
      )
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          verificationToken: res.verificationToken || '',
          email: email.trim(),
          isResetPassword: '1',
        },
      })
    } catch (err: any) {
      Alert.alert('Thất bại', err.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell showBackButton title="Quên mật khẩu">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView className="px-6 py-8" keyboardShouldPersistTaps="handled">
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-full bg-sky-50 items-center justify-center mb-3">
              <Ionicons name="key-outline" size={32} color="#0284c7" />
            </View>
            <Text className="text-2xl font-bold text-slate-800">
              Đặt lại mật khẩu
            </Text>
            <Text className="text-sm text-slate-500 text-center mt-2 px-4">
              Nhập email hoặc số điện thoại đã đăng ký để nhận mã OTP khôi phục tài khoản.
            </Text>
          </View>

          <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
            <Input
              label="Email hoặc Số điện thoại"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Ionicons name="mail-outline" size={20} color="#94a3b8" />}
            />

            <Button
              title="Gửi mã xác thực"
              size="lg"
              isLoading={loading}
              onPress={handleSubmit}
              className="mt-2"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
