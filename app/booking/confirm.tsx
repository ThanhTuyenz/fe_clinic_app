import React, { useState, useEffect } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useBookingStore } from '../../src/store/useBookingStore'
import { useAuthStore } from '../../src/store/useAuthStore'
import { voucherService, Voucher } from '../../src/services/voucherService'
import { formatCurrencyVi } from '../../src/utils/date'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'
import { BookingTimeline } from '../../src/components/booking/BookingTimeline'

export default function BookingConfirmScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { draft, setAppliedVoucher, setVoucherCode } = useBookingStore()

  const [inputCode, setInputCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [availableVouchers, setAvailableVouchers] = useState<Voucher[]>([])
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false)

  const isPackage = draft.bookingMethod === 'HEALTH_PACKAGE' || Boolean(draft.healthPackage)
  const serviceName = isPackage
    ? draft.healthPackage?.name || 'Gói khám sức khỏe'
    : draft.doctor?.full_name || draft.doctor?.fullName || draft.doctor?.name || 'Bác sĩ chuyên khoa'

  const doctorSpecialty =
    typeof draft.doctor?.specialty === 'object'
      ? draft.doctor?.specialty?.name
      : draft.doctor?.specialty || draft.doctor?.specialty_name || draft.specialty?.name || 'Đa khoa'

  const subtotal = isPackage
    ? Number(draft.healthPackage?.price ?? 1200000)
    : Number(draft.doctor?.price || draft.doctor?.consultation_fee || 300000)

  // Load available vouchers
  useEffect(() => {
    let isMounted = true
    setIsLoadingVouchers(true)
    voucherService
      .getAvailableVouchers()
      .then((vouchers) => {
        if (isMounted) {
          setAvailableVouchers(vouchers)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingVouchers(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Calculate discount and final amount
  const appliedVoucher = draft.appliedVoucher
  const discountAmount = appliedVoucher?.discountAmount || 0
  const totalAmount = Math.max(0, subtotal - discountAmount)

  // Handle Apply Voucher
  const handleApplyVoucherCode = async (codeToApply: string) => {
    const code = codeToApply.trim().toUpperCase()
    if (!code) {
      Alert.alert('Chưa nhập mã', 'Vui lòng nhập mã giảm giá trước khi áp dụng.')
      return
    }

    try {
      setIsValidating(true)
      const res = await voucherService.validateVoucher(code, subtotal)
      if (res && res.valid) {
        setAppliedVoucher({
          code: res.voucher?.code || code,
          name: res.voucher?.name || code,
          discountAmount: res.discountAmount,
          discountType: res.voucher?.discountType,
          discountValue: res.voucher?.discountValue,
        })
        setVoucherCode(res.voucher?.code || code)
        setInputCode('')
        Alert.alert('Thành công', res.message || `Đã áp dụng mã ${code}`)
      } else {
        Alert.alert('Không thể áp dụng', res?.message || 'Mã ưu đãi không hợp lệ hoặc đã hết hạn.')
      }
    } catch (err: any) {
      // Fallback for mock demo vouchers if backend DB has no vouchers
      if (code === 'VITACARE50' || code === 'WELCOME') {
        const fakeDiscount = code === 'VITACARE50' ? 50000 : Math.round(subtotal * 0.1)
        setAppliedVoucher({
          code,
          name: `Ưu đãi ${code}`,
          discountAmount: fakeDiscount,
          discountType: 'FIXED_AMOUNT',
          discountValue: fakeDiscount,
        })
        setVoucherCode(code)
        setInputCode('')
        Alert.alert('Thành công', `Đã áp dụng mã ${code}, giảm ${formatCurrencyVi(fakeDiscount)}`)
      } else {
        Alert.alert('Không thể áp dụng', err.message || 'Mã ưu đãi không hợp lệ.')
      }
    } finally {
      setIsValidating(false)
    }
  }

  // Handle Remove Voucher
  const handleRemoveVoucher = () => {
    setAppliedVoucher(null)
    setVoucherCode(undefined)
  }

  // Profile data
  const profile = draft.selectedProfile

  const formatDob = (dob?: string | Date) => {
    if (!dob) return ''
    const str = typeof dob === 'string' ? dob : dob.toISOString()
    const datePart = str.split('T')[0]
    const parts = datePart.split('-')
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
    return datePart
  }

  const fullAddress =
    profile?.address?.trim() ||
    [profile?.streetAddress, profile?.wardName, profile?.districtName, profile?.provinceName]
      .filter(Boolean)
      .join(', ') ||
    user?.address?.trim()

  return (
    <ScreenShell showBackButton title="Xác nhận lịch khám">
      <BookingTimeline currentStep={3} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-slate-50"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 }}
        >
          {/* Card 1: Dịch vụ & Thời gian khám */}
          <View className="bg-white border border-slate-200/90 rounded-lg p-4 mb-3.5 shadow-2xs">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                {isPackage ? 'Gói khám sức khỏe' : 'Bác sĩ chuyên khoa'}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/booking')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-xs font-semibold text-emerald-700">Đổi lịch</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-bold text-slate-900 leading-snug">
              {serviceName}
            </Text>
            {!isPackage && (
              <Text className="text-xs text-slate-500 mt-0.5">
                Chuyên khoa: {doctorSpecialty}
              </Text>
            )}

            <View className="flex-row items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-100 flex-wrap">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="calendar-outline" size={13} color="#059669" />
                <Text className="text-xs font-semibold text-slate-700">
                  {draft.date}
                </Text>
              </View>

              <View className="flex-row items-center gap-1.5">
                <Ionicons name="time-outline" size={13} color="#059669" />
                <Text className="text-xs font-semibold text-slate-700">
                  {draft.slot}
                </Text>
              </View>
            </View>
          </View>

          {/* Card 2: Người thực hiện khám */}
          <View className="bg-white border border-slate-200/90 rounded-lg p-4 mb-3.5 shadow-2xs">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                Người khám bệnh
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-xs font-semibold text-emerald-700">Đổi hồ sơ</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row items-center gap-2 mb-1.5">
              <Text className="text-sm font-bold text-slate-900">
                {profile?.fullName || user?.full_name || 'Bệnh nhân'}
              </Text>
              {Boolean(profile?.relationshipToAccount) && (
                <View className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200">
                  <Text className="text-[10px] font-bold text-emerald-700">
                    {profile?.relationshipToAccount === 'SELF' ? 'Bản thân' : profile?.relationshipToAccount}
                  </Text>
                </View>
              )}
            </View>

            <View className="space-y-1">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="call-outline" size={12} color="#64748b" />
                <Text className="text-xs text-slate-600">
                  SĐT: {profile?.phoneNumber || user?.phone || 'Chưa cập nhật'}
                </Text>
                {Boolean(profile?.dateOfBirth) && (
                  <>
                    <Text className="text-slate-300">•</Text>
                    <Text className="text-xs text-slate-600">
                      {formatDob(profile?.dateOfBirth)} ({profile?.gender === 'FEMALE' ? 'Nữ' : 'Nam'})
                    </Text>
                  </>
                )}
              </View>

              {Boolean(profile?.nationalId || profile?.identityCardNumber) && (
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="card-outline" size={12} color="#64748b" />
                  <Text className="text-xs text-slate-600">
                    CCCD: {profile?.nationalId || profile?.identityCardNumber}
                  </Text>
                </View>
              )}

              <View className="flex-row items-start gap-1.5 mt-0.5">
                <Ionicons name="location-outline" size={13} color="#64748b" style={{ marginTop: 1 }} />
                <Text className="text-xs text-slate-600 flex-1 leading-4" numberOfLines={2}>
                  Địa chỉ: {fullAddress || 'Chưa cập nhật'}
                </Text>
              </View>
            </View>
          </View>

          {/* Card 3: Mã ưu đãi / Voucher */}
          <View className="bg-white border border-slate-200/90 rounded-lg p-4 mb-3.5 shadow-2xs">
            <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Mã giảm giá & Ưu đãi
            </Text>

            {appliedVoucher ? (
              /* Đã áp dụng voucher */
              <View className="flex-row items-center justify-between bg-emerald-50/70 border border-emerald-200 rounded-lg p-3">
                <View className="flex-row items-center flex-1 pr-2">
                  <Ionicons name="ticket-outline" size={20} color="#059669" style={{ marginRight: 8 }} />
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-emerald-950">
                      Mã: {appliedVoucher.code}
                    </Text>
                    <Text className="text-2xs font-semibold text-emerald-700 mt-0.5">
                      Giảm: - {formatCurrencyVi(appliedVoucher.discountAmount)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleRemoveVoucher}
                  className="px-2.5 py-1 rounded border border-rose-200 bg-rose-50"
                >
                  <Text className="text-xs font-semibold text-rose-700">Gỡ bỏ</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Nhập mã voucher */
              <View>
                <View className="flex-row items-center gap-2 mb-2">
                  <TextInput
                    value={inputCode}
                    onChangeText={setInputCode}
                    placeholder="Nhập mã ưu đãi (VD: VITACARE50)"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800"
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isValidating || !inputCode.trim()}
                    onPress={() => handleApplyVoucherCode(inputCode)}
                    className={`px-4 py-2.5 rounded-lg items-center justify-center ${
                      inputCode.trim() ? 'bg-emerald-700 active:bg-emerald-800' : 'bg-slate-200'
                    }`}
                  >
                    {isValidating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text
                        className={`text-xs font-bold ${
                          inputCode.trim() ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        Áp dụng
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Danh sách gợi ý voucher khả dụng */}
                {availableVouchers.length > 0 ? (
                  <View className="mt-1">
                    <Text className="text-[11px] text-slate-400 font-medium mb-1.5">
                      Voucher khả dụng:
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {availableVouchers.slice(0, 4).map((v) => (
                        <TouchableOpacity
                          key={v.id || v.code}
                          activeOpacity={0.7}
                          onPress={() => handleApplyVoucherCode(v.code)}
                          className="border border-dashed border-emerald-300 bg-white px-2.5 py-1 rounded flex-row items-center gap-1"
                        >
                          <Ionicons name="pricetag-outline" size={11} color="#059669" />
                          <Text className="text-[11px] font-bold text-emerald-800">{v.code}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : (
                  <View className="flex-row gap-1.5 mt-1">
                    <TouchableOpacity
                      onPress={() => handleApplyVoucherCode('VITACARE50')}
                      className="border border-dashed border-slate-300 bg-white px-2 py-1 rounded"
                    >
                      <Text className="text-[11px] font-semibold text-slate-600">Gợi ý: VITACARE50</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Card 4: Chi tiết viện phí */}
          <View className="bg-white border border-slate-200/90 rounded-lg p-4 mb-2 shadow-2xs">
            <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Chi tiết viện phí
            </Text>

            <View className="space-y-2">
              <View className="flex-row justify-between items-center py-1">
                <Text className="text-xs text-slate-600">Giá dịch vụ khám:</Text>
                <Text className="text-xs font-semibold text-slate-800">
                  {formatCurrencyVi(subtotal)}
                </Text>
              </View>

              {discountAmount > 0 && (
                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-xs text-emerald-700 font-medium">Giảm giá voucher:</Text>
                  <Text className="text-xs font-bold text-emerald-700">
                    - {formatCurrencyVi(discountAmount)}
                  </Text>
                </View>
              )}

              <View className="flex-row justify-between items-center py-1">
                <Text className="text-xs text-slate-600">Phí tiện ích:</Text>
                <Text className="text-xs font-semibold text-emerald-700">Miễn phí</Text>
              </View>

              <View className="border-t border-slate-100 pt-2.5 flex-row justify-between items-center">
                <Text className="text-xs font-bold text-slate-900">Tổng thanh toán:</Text>
                <Text className="text-base font-extrabold text-emerald-800">
                  {formatCurrencyVi(totalAmount)}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Bar: Tiến hành thanh toán */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-[11px] text-slate-400 font-medium">Cần thanh toán:</Text>
            <Text className="text-base font-extrabold text-emerald-800 leading-tight">
              {formatCurrencyVi(totalAmount)}
            </Text>
          </View>

          <View className="w-[180px]">
            <Button
              title="Tiến hành thanh toán"
              onPress={() => router.push('/booking/payment')}
              className="py-3 rounded-lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
