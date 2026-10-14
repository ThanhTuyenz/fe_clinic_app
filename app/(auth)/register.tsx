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
import { registerSchema, RegisterFormValues } from '@/utils'
import { authService } from '@/services'
import { useBookingStore } from '@/store/useBookingStore'
import { Input, ScreenShell, ZaloLogo } from '@/components/common'
import { ZaloLinkModal, ZaloLoginModal } from '@/components/auth'
import { useGoogleLogin } from '@/hooks/useGoogleLogin'

export default function RegisterScreen() {
  const router = useRouter()
  const draft = useBookingStore((state) => state.draft)
  const [loading, setLoading] = useState(false)
  const { loginWithGoogle, googleLoading } = useGoogleLogin()
  const [zaloLoginModalVisible, setZaloLoginModalVisible] = useState(false)


  const [linkModalData, setLinkModalData] = useState<{
    visible: boolean
    phoneNumber: string
    email: string
    fullName: string
    password: string
    zaloUserName?: string | null
  }>({
    visible: false,
    phoneNumber: '',
    email: '',
    fullName: '',
    password: '',
    zaloUserName: null,
  })

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      setLoading(true)
      const phoneClean = data.phone.trim()
      const emailClean = (data.email || '').trim().toLowerCase()

      // 1. Kiểm tra SĐT có tài khoản Zalo chưa (Kịch bản 2)
      const checkRes = await authService.checkPhoneLink(phoneClean)

      if (checkRes.exists && checkRes.isZaloAccount) {
        // Hiển thị modal xác nhận liên kết Email & mật khẩu vào tài khoản Zalo đã có
        setLinkModalData({
          visible: true,
          phoneNumber: phoneClean,
          email: emailClean || `${phoneClean}@vitacare.vn`,
          fullName: data.fullName.trim(),
          password: data.password,
          zaloUserName: checkRes.fullName,
        })
        return
      }

      if (checkRes.exists && !checkRes.isZaloAccount) {
        Alert.alert(
          'Tài khoản đã tồn tại',
          'Số điện thoại này đã được đăng ký tài khoản. Vui lòng chuyển sang đăng nhập.',
          [
            { text: 'Hủy', style: 'cancel' },
            { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
          ],
        )
        return
      }

      // 2. Nếu là tài khoản mới: Gọi API đăng ký (gửi mã OTP qua Zalo ZNS)
      await authService.register({
        fullName: data.fullName.trim(),
        email: emailClean || phoneClean,
        phoneNumber: phoneClean,
        password: data.password,
      })

      // 3. Chuyển tiếp tới màn hình nhập OTP Zalo
      router.push({
        pathname: '/(auth)/verify-otp',
        params: {
          phone: phoneClean,
          password: data.password,
          fullName: data.fullName.trim(),
        },
      })
    } catch (err: any) {
      Alert.alert('Đăng ký thất bại', err.message || 'Có lỗi xảy ra, vui lòng thử lại.')
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
          {/* PHẦN TRÊN: Top Bar, Logo, Title, Form, Nút Đăng ký */}
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
                Tạo tài khoản mới
              </Text>
              <Text className="text-sm text-slate-400 mt-1.5 text-center">
                Đăng ký để quản lý hồ sơ khám và nhận ưu đãi từ phòng khám
              </Text>
            </View>

            {/* Form Fields */}
            <View className="mb-4">
              <Controller
                control={control}
                name="fullName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Họ và tên"
                    placeholder="VD: Nguyễn Văn An"
                    leftIcon={<Ionicons name="person-outline" size={18} color="#94a3b8" />}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.fullName?.message}
                  />
                )}
              />

              <View className="mt-3">
                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Số điện thoại"
                      placeholder="VD: 0912345678"
                      keyboardType="phone-pad"
                      leftIcon={<Ionicons name="call-outline" size={18} color="#94a3b8" />}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.phone?.message}
                    />
                  )}
                />
              </View>

              <View className="mt-3">
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Email (Không bắt buộc)"
                      placeholder="name@example.com"
                      keyboardType="email-address"
                      leftIcon={<Ionicons name="mail-outline" size={18} color="#94a3b8" />}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.email?.message}
                    />
                  )}
                />
              </View>

              <View className="mt-3">
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Mật khẩu"
                      placeholder="Tối thiểu 6 ký tự"
                      isPassword
                      leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#94a3b8" />}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.password?.message}
                    />
                  )}
                />
              </View>

              <View className="mt-3">
                <Controller
                  control={control}
                  name="confirmPassword"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      label="Xác nhận mật khẩu"
                      placeholder="Nhập lại mật khẩu"
                      isPassword
                      leftIcon={<Ionicons name="shield-checkmark-outline" size={18} color="#94a3b8" />}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={errors.confirmPassword?.message}
                    />
                  )}
                />
              </View>
            </View>

            {/* Nút Đăng ký chính */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={loading || googleLoading}
              onPress={() => { void handleSubmit(onSubmit)() }}
              className="w-full bg-primary-600 active:bg-primary-800 py-4 rounded-xl items-center justify-center shadow-xs mt-2"
            >
              <Text className="text-white text-base font-bold tracking-wide">
                {loading ? 'Đang xử lý...' : 'Đăng ký'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* PHẦN DƯỚI: Hoặc đăng ký với + Social Buttons + Chân trang */}
          <View className="w-full pt-8 pb-6">
            {/* Dòng phân cách: - Or sign up with - */}
            <View className="mb-6 items-center justify-center">
              <Text className="text-xs text-slate-400 font-medium">
                - Hoặc đăng ký với -
              </Text>
            </View>

            {/* Hàng nút Social Logins: Google, Zalo */}
            <View className="flex-row justify-center items-center gap-4 mb-8">
              {/* Google */}
              <TouchableOpacity
                activeOpacity={0.8}
                accessibilityLabel="Tiếp tục bằng Google"
                disabled={loading || googleLoading}
                onPress={() => { void loginWithGoogle() }}
                className="w-28 h-14 bg-white rounded-lg border border-slate-200 shadow-xs items-center justify-center active:bg-slate-50"
              >
                <Ionicons name="logo-google" size={26} color="#ea4335" />
              </TouchableOpacity>

              {/* Zalo */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setZaloLoginModalVisible(true)}
                disabled={loading || googleLoading}
                className="w-28 h-14 bg-white rounded-lg border border-slate-200 shadow-xs items-center justify-center active:bg-slate-50"
              >
                <ZaloLogo size={32} />
              </TouchableOpacity>
            </View>

            {/* Chân trang */}
            <View className="items-center">
              <View className="flex-row items-center">
                <Text className="text-sm text-slate-500">
                  Đã có tài khoản?{' '}
                </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity activeOpacity={0.7}>
                    <Text className="text-sm font-bold text-primary-700">
                      Đăng nhập
                    </Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal liên kết tài khoản Zalo đã tồn tại (Kịch bản 2) */}
      <ZaloLinkModal
        visible={linkModalData.visible}
        phoneNumber={linkModalData.phoneNumber}
        email={linkModalData.email}
        fullName={linkModalData.fullName}
        password={linkModalData.password}
        zaloUserName={linkModalData.zaloUserName}
        onClose={() => setLinkModalData((prev) => ({ ...prev, visible: false }))}
        onSuccess={() => {
          setLinkModalData((prev) => ({ ...prev, visible: false }))
          const hasDraft = Boolean(
            (draft.doctor || draft.healthPackage || draft.specialtyService || draft.specialty) &&
            draft.date &&
            draft.slot
          )
          if (hasDraft) {
            router.replace('/booking/patient-info')
          } else {
            router.replace('/(tabs)')
          }
        }}
      />

      {/* Modal đăng ký / đăng nhập Zalo nhanh */}
      <ZaloLoginModal
        visible={zaloLoginModalVisible}
        onClose={() => setZaloLoginModalVisible(false)}
        onSuccess={() => {
          setZaloLoginModalVisible(false)
          const hasDraft = Boolean(
            (draft.doctor || draft.healthPackage || draft.specialtyService || draft.specialty) &&
            draft.date &&
            draft.slot
          )
          if (hasDraft) {
            router.replace('/booking/patient-info')
          } else {
            router.replace('/(tabs)')
          }
        }}
      />
    </ScreenShell>
  )
}
