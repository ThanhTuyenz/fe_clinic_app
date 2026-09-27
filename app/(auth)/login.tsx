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
import { loginSchema, LoginFormValues } from '../../src/utils/validation'
import { authService } from '../../src/services/authService'
import { useAuthStore } from '../../src/store/useAuthStore'
import { Input } from '../../src/components/common/Input'
import { Button } from '../../src/components/common/Button'
import { ScreenShell } from '../../src/components/common/ScreenShell'

export default function LoginScreen() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    try {
      setLoading(true)
      const res = await authService.login({
        email: data.identifier,
        password: data.password,
      })

      if (res.token && res.user) {
        await setAuth(res.token, res.user)
        router.replace('/(tabs)')
      } else {
        Alert.alert('Đăng nhập', res.message || 'Đăng nhập thành công')
        router.replace('/(tabs)')
      }
    } catch (err: any) {
      Alert.alert('Đăng nhập thất bại', err.message || 'Kiểm tra lại tài khoản hoặc mật khẩu.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo & Welcome Header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-2xl bg-sky-600 items-center justify-center mb-3 shadow-md">
              <Ionicons name="medical" size={32} color="#ffffff" />
            </View>
            <Text className="text-2xl font-black text-slate-800 tracking-tight">
              VitaCare Clinic
            </Text>
            <Text className="text-sm text-slate-500 mt-1">
              Đăng nhập để đặt lịch khám & quản lý hồ sơ sức khỏe
            </Text>
          </View>

          {/* Form */}
          <View className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm mb-6">
            <Controller
              control={control}
              name="identifier"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Email hoặc Số điện thoại"
                  placeholder="name@example.com hoặc 0912..."
                  keyboardType="email-address"
                  leftIcon={<Ionicons name="person-outline" size={20} color="#94a3b8" />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.identifier?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Mật khẩu"
                  placeholder="Nhập mật khẩu"
                  isPassword
                  leftIcon={<Ionicons name="lock-closed-outline" size={20} color="#94a3b8" />}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <View className="items-end mb-4">
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <Text className="text-xs font-semibold text-sky-600">
                    Quên mật khẩu?
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            <Button
              title="Đăng nhập"
              size="lg"
              isLoading={loading}
              onPress={handleSubmit(onSubmit)}
            />
          </View>

          {/* Bottom Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-sm text-slate-500">Chưa có tài khoản? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity>
                <Text className="text-sm font-bold text-sky-600">Đăng ký ngay</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
