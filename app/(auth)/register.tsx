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
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { registerSchema, RegisterFormValues } from '../../src/utils/validation'
import { authService } from '../../src/services/authService'
import { Input } from '../../src/components/common/Input'
import { Button } from '../../src/components/common/Button'
import { ScreenShell } from '../../src/components/common/ScreenShell'

export default function RegisterScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setLoading(true)
      // Tách họ và tên
      const nameParts = data.fullName.trim().split(' ')
      const firstName = nameParts.slice(0, -1).join(' ') || 'Nguyễn'
      const lastName = nameParts.slice(-1).join(' ') || data.fullName

      // Bắt đầu đăng ký gửi OTP qua email/phone
      const res = await authService.startRegister({
        email: `${data.phone}@vitacare.vn`,
      })

      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          verificationToken: res.verificationToken || '',
          phone: data.phone,
          firstName,
          lastName,
          password: data.password,
        },
      })
    } catch (err: any) {
      Alert.alert('Đăng ký thất bại', err.message || 'Có lỗi xảy ra, vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell showBackButton title="Đăng ký tài khoản">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="px-6 py-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-800 tracking-tight">
              Tạo tài khoản mới
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Đăng ký để nhận các ưu đãi và quản lý lịch khám dễ dàng
            </Text>
          </View>

          <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Họ và tên *"
                  placeholder="VD: Trần Văn B"
                  leftIcon={<Ionicons name="person-outline" size={20} color="#94a3b8" />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.fullName?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Số điện thoại *"
                  placeholder="VD: 0912345678"
                  keyboardType="phone-pad"
                  leftIcon={<Ionicons name="call-outline" size={20} color="#94a3b8" />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.phone?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mật khẩu *"
                  placeholder="Tối thiểu 6 ký tự"
                  isPassword
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Xác nhận mật khẩu *"
                  placeholder="Nhập lại mật khẩu"
                  isPassword
                  leftIcon={<Ionicons name="shield-checkmark-outline" size={20} color="#94a3b8" />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              title="Tiếp tục"
              size="lg"
              isLoading={loading}
              onPress={handleSubmit(onSubmit)}
              className="mt-2"
            />
          </View>

          <View className="flex-row justify-center items-center mb-8">
            <Text className="text-sm text-slate-500">Đã có tài khoản? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-sm font-bold text-sky-600">Đăng nhập</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
