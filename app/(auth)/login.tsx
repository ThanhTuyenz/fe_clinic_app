import { useState } from 'react'
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
import { Image } from 'expo-image'
import { loginSchema, LoginFormValues } from '@/utils'
import { authService } from '@/services'
import { useAuthStore } from '@/store/useAuthStore'
import { useBookingStore } from '@/store/useBookingStore'
import { Input, ScreenShell, ZaloLogo } from '@/components/common'
import { ZaloLoginModal } from '@/components/auth'
import { useGoogleLogin } from '@/hooks/useGoogleLogin'

export default function LoginScreen() {
  const router = useRouter()
  const setAuth = useAuthStore((state) => state.setAuth)
  const draft = useBookingStore((state) => state.draft)
  const [loading, setLoading] = useState(false)
  const { loginWithGoogle, googleLoading } = useGoogleLogin()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [zaloModalVisible, setZaloModalVisible] = useState(false)


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
      setErrorMessage(null)
      setLoading(true)
      const res = await authService.login({
        email: data.identifier.trim(),
        password: data.password,
      })

      if (res.token && res.user) {
        await setAuth(res.token, res.user, res.refreshToken)
        // Nếu bệnh nhân đang đặt dở lịch hẹn thì chuyển tiếp tới bước chọn người khám
        const hasDraft = Boolean(
          (draft.doctor || draft.healthPackage || draft.specialtyService || draft.specialty) &&
          draft.date &&
          draft.slot
        )
        if (hasDraft) {
          router.replace('/booking/patient-info')
        } else if (router.canGoBack()) {
          router.back()
        } else {
          router.replace('/(tabs)')
        }
      } else {
        router.replace('/(tabs)')
      }
    } catch (err: any) {
      const msg = err.message || 'Kiểm tra lại tài khoản hoặc mật khẩu.'
      setErrorMessage(msg)
      Alert.alert('Đăng nhập thất bại', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
          className="px-7 py-4"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* PHẦN TRÊN: Top Bar, Logo, Title, Form, Nút Đăng nhập */}
          <View className="w-full">
            {/* Top Bar với nút Quay lại tối giản */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="self-start p-2 -ml-2 mb-2 active:opacity-60"
            >
              <Ionicons name="arrow-back" size={22} color="#0f172a" />
            </TouchableOpacity>

            {/* Logo trung tâm to rõ chuẩn chính hãng VitaCare */}
            <View className="items-center mt-2 mb-6">
              <Image
                source={require('../../assets/images/logo.png')}
                style={{ width: 130, height: 100 }}
                contentFit="contain"
                transition={200}
              />
            </View>

            {/* Tiêu đề căn giữa */}
            <View className="mb-6 items-center">
              <Text className="text-2xl font-bold text-slate-900 tracking-tight text-center">
                Đăng nhập tài khoản
              </Text>
              <Text className="text-sm text-slate-400 mt-1.5 text-center">
                Nhập thông tin xác thực để truy cập hồ sơ y tế
              </Text>
            </View>

            {/* Error Banner nếu có */}
            {errorMessage && (
              <View className="bg-rose-50 border border-rose-200 p-3 rounded-lg mb-4 flex-row items-center">
                <Ionicons
                  name="alert-circle"
                  size={18}
                  color="#e11d48"
                  style={{ marginRight: 8 }}
                />
                <Text className="text-xs text-rose-700 font-medium flex-1">
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Form Inputs theo phong cách phẳng, tinh gọn */}
            <View className="mb-3">
              <Controller
                control={control}
                name="identifier"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Email hoặc Số điện thoại"
                    placeholder="name@gmail.com"
                    keyboardType="email-address"
                    leftIcon={
                      <Ionicons name="mail-outline" size={18} color="#94a3b8" />
                    }
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.identifier?.message}
                  />
                )}
              />

              <View className="mt-3">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Mật khẩu"
                      placeholder="Nhập mật khẩu"
                      isPassword
                      leftIcon={
                        <Ionicons
                          name="lock-closed-outline"
                          size={18}
                          color="#94a3b8"
                        />
                      }
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.password?.message}
                    />
                  )}
                />
              </View>
            </View>

            {/* Quên mật khẩu */}
            <View className="items-end mb-6">
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text className="text-xs font-semibold text-primary-700">
                    Quên mật khẩu?
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Nút Đăng nhập chính */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading || googleLoading}
              onPress={() => { void handleSubmit(onSubmit)() }}
              className="w-full bg-primary-600 active:bg-primary-800 py-4 rounded-xl items-center justify-center shadow-xs"
            >
              <Text className="text-white text-base font-bold tracking-wide">
                {loading ? 'Đang xác thực...' : 'Đăng nhập'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* PHẦN DƯỚI: Hoặc đăng nhập với + Social Buttons + Chân trang */}
          <View className="w-full pt-8 pb-6">
            {/* Dòng phân cách: - Hoặc đăng nhập với - */}
            <View className="mb-6 items-center justify-center">
              <Text className="text-xs text-slate-400 font-medium">
                - Hoặc đăng nhập với -
              </Text>
            </View>

            {/* Hàng nút Social Logins: Google, Zalo */}
            <View className="flex-row justify-center items-center gap-4 mb-8">
              {/* Google */}
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityLabel="Đăng nhập bằng Google"
                disabled={loading || googleLoading}
                onPress={() => { void loginWithGoogle() }}
                className="w-28 h-14 bg-white rounded-lg border border-slate-200 shadow-xs items-center justify-center active:bg-slate-50"
              >
                <Ionicons name="logo-google" size={26} color="#ea4335" />
              </TouchableOpacity>

              {/* Zalo */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setZaloModalVisible(true)}
                disabled={loading || googleLoading}
                className="w-28 h-14 bg-white rounded-lg border border-slate-200 shadow-xs items-center justify-center active:bg-slate-50"
              >
                <ZaloLogo size={32} />
              </TouchableOpacity>
            </View>

            {/* Chân trang */}
            <View className="items-center">
              <View className="flex-row items-center mb-3">
                <Text className="text-sm text-slate-500">
                  Chưa có tài khoản?{' '}
                </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text className="text-sm font-bold text-primary-700">
                      Đăng ký ngay
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.replace('/(tabs)')}
                className="py-1 px-3"
              >
                <Text className="text-xs font-medium text-slate-400">
                  Tiếp tục khám phá không cần đăng nhập
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <ZaloLoginModal
        visible={zaloModalVisible}
        onClose={() => setZaloModalVisible(false)}
        onSuccess={() => {
          const hasDraft = Boolean(
            (draft.doctor || draft.healthPackage || draft.specialtyService || draft.specialty) &&
            draft.date &&
            draft.slot
          )
          if (hasDraft) {
            router.replace('/booking/patient-info')
          } else if (router.canGoBack()) {
            router.back()
          } else {
            router.replace('/(tabs)')
          }
        }}
      />
    </ScreenShell>
  )
}
