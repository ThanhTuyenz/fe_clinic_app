import { useState } from 'react'
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
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'

import { useBookingStore } from '../../src/store/useBookingStore'
import { useAuthStore } from '../../src/store/useAuthStore'
import { bookingService } from '../../src/services/bookingService'
import { voucherService } from '../../src/services/voucherService'
import { formatCurrencyVi, formatDateVi } from '../../src/utils/date'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'
import { BookingTimeline } from '../../src/components/booking/BookingTimeline'

function ConfirmationField({ label, value, detail, highlight = false }: {
  label: string
  value: string
  detail?: string
  highlight?: boolean
}) {
  return (
    <View className="flex-row items-start gap-3">
      <Text className="text-[13px] leading-6 text-slate-500 font-medium" style={{ width: '38%' }}>
        {label}:
      </Text>
      <View className="flex-1 gap-1" style={{ minWidth: 0 }}>
        <Text className={`text-sm leading-6 font-semibold text-right ${highlight ? 'text-primary-700' : 'text-slate-800'}`}>
          {value}
        </Text>
        {detail ? <Text className="text-[13px] leading-6 text-slate-600 text-right">{detail}</Text> : null}
      </View>
    </View>
  )
}

export default function BookingConfirmScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { draft, setAppliedVoucher, setVoucherCode } = useBookingStore()

  const [inputCode, setInputCode] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [isCodeExpanded, setIsCodeExpanded] = useState(true)

  // Query branches to show branch name / address
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => bookingService.getBookingInit({ flow: 'facility' }).then((init) => init.branches),
    staleTime: 5 * 60 * 1000,
  })
  const currentBranch = branches.find((b: any) => String(b.id) === String(draft.branchId))

  const isPackage = draft.bookingMethod === 'HEALTH_PACKAGE' || Boolean(draft.healthPackage)
  const isSpecialtyExam = draft.bookingMethod === 'SPECIALTY_EXAM' && Boolean(draft.specialtyService)

  const serviceName = isPackage
    ? draft.healthPackage?.name || 'Gói khám sức khỏe tổng quát'
    : isSpecialtyExam
      ? draft.specialtyService?.name || 'Khám chuyên khoa'
      : draft.doctor?.full_name || draft.doctor?.fullName || draft.doctor?.name || 'Bác sĩ chuyên khoa'

  const doctorSpecialty =
    typeof draft.doctor?.specialty === 'object'
      ? draft.doctor?.specialty?.name
      : draft.doctor?.specialty || draft.doctor?.specialty_name || draft.specialty?.name || 'Đa khoa'

  const subtotal = isPackage
    ? Number(draft.healthPackage?.price ?? 1200000)
    : isSpecialtyExam && draft.specialtyService?.price
      ? Number(draft.specialtyService.price)
      : Number(
          draft.bookingMethod === 'ONLINE_CONSULTATION'
            ? draft.doctor?.onlineConsultationFee ||
                draft.doctor?.consultation_fee ||
                draft.doctor?.price ||
                300000
            : draft.doctor?.price || draft.doctor?.consultation_fee || 300000
        )

  const serviceFee = 10000
  const avatarUrl = isPackage
    ? 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=200'
    : draft.doctor?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200'

  // Query vouchers — nhất quán với cách fetch branches ở trên
  const { data: availableVouchers = [] } = useQuery({
    queryKey: ['vouchers-available'],
    queryFn: () => voucherService.getAvailableVouchers(),
    staleTime: 5 * 60 * 1000, // cache 5 phút
  })


  // Calculate discount and final amount
  const appliedVoucher = draft.appliedVoucher
  const discountAmount = appliedVoucher?.discountAmount || 0
  const totalAmount = Math.max(0, subtotal + serviceFee - discountAmount)

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
      Alert.alert('Không thể áp dụng', err.message || 'Mã ưu đãi không hợp lệ.')
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
    <ScreenShell showBackButton title="Kiểm tra thông tin đặt khám">
      <BookingTimeline currentStep={3} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >

          {/* Dải phân cách xám dày */}
          <View className="h-2 bg-slate-100 border-y border-slate-200/60" />

          {/* 2. ITEM & READ-ONLY DETAILS BLOCK (Chỉ kiểm tra thông tin, không cho đổi) */}
          <View className="px-4 py-6 bg-white">
            {/* Header tóm tắt Bác sĩ / Gói khám */}
            <View className="flex-row items-start">
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 88, height: 104, borderRadius: 8, flexShrink: 0 }}
                className="bg-slate-100"
                contentFit="cover"
                transition={200}
              />

              <View className="flex-1 ml-3" style={{ minWidth: 0 }}>
                <Text className="text-sm font-bold text-slate-900 leading-5">
                  {serviceName}
                </Text>
                <Text className="text-xs leading-5 text-slate-500 mt-1">
                  {isPackage ? 'Gói khám VitaCare' : `Chuyên khoa: ${doctorSpecialty}`}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                  className="text-base leading-6 font-bold text-slate-900 mt-1.5"
                >
                  {formatCurrencyVi(subtotal)}
                </Text>
              </View>
            </View>

            {/* Khối Thông tin Lịch hẹn & Người khám (Gộp chung 1 khối liền mạch, không tách vụn) */}
            <View className="mt-6 bg-slate-50 border border-slate-200 rounded-xl p-4">
              {/* Phần 1: Thời gian khám */}
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="calendar-outline" size={14} color="#28a745" />
                  <Text className="text-sm leading-5 font-bold text-slate-800">
                    Thời gian khám bệnh
                  </Text>
                </View>
              </View>

              <View className="gap-3">
                <ConfirmationField label="Ngày khám" value={formatDateVi(draft.date)} />
                <ConfirmationField label="Khung giờ tiếp đón" value={draft.slot || 'Chưa chọn'} highlight />
                {Boolean(currentBranch?.name || draft.branchId) && (
                  <ConfirmationField
                    label="Cơ sở khám"
                    value={currentBranch?.name || 'VitaCare Clinic'}
                    detail={currentBranch?.address || undefined}
                  />
                )}
              </View>

              {/* Đường kẻ mảnh phân cách nội bộ giữa 2 phần trong cùng 1 khối */}
              <View className="my-5 border-b border-slate-200/70" />

              {/* Phần 2: Người khám bệnh */}
              <View className="flex-row flex-wrap items-center justify-between gap-2 mb-4">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons name="person-outline" size={14} color="#28a745" />
                  <Text className="text-sm leading-5 font-bold text-slate-800">
                    Thông tin người khám bệnh
                  </Text>
                </View>
                {Boolean(profile?.relationshipToAccount) && (
                  <View className="px-2 py-0.5 rounded bg-primary-100/80">
                    <Text className="text-[10px] font-bold text-primary-800">
                      {profile?.relationshipToAccount === 'SELF' ? 'Bản thân' : profile?.relationshipToAccount}
                    </Text>
                  </View>
                )}
              </View>

              <View className="gap-3">
                <ConfirmationField
                  label="Họ và tên"
                  value={profile?.fullName || user?.full_name || user?.fullName || 'Bệnh nhân'}
                />
                <ConfirmationField label="Số điện thoại" value={profile?.phoneNumber || user?.phone || 'Chưa cập nhật'} />
                {(Boolean(profile?.dateOfBirth) || Boolean(profile?.gender)) && (
                  <ConfirmationField
                    label="Ngày sinh / Giới tính"
                    value={[
                      formatDob(profile?.dateOfBirth),
                      profile?.gender ? `(${profile.gender === 'FEMALE' ? 'Nữ' : profile.gender === 'MALE' ? 'Nam' : 'Khác'})` : '',
                    ].filter(Boolean).join(' ')}
                  />
                )}
                {Boolean(profile?.nationalId || profile?.identityCardNumber) && (
                  <ConfirmationField label="Số CCCD / Định danh" value={profile?.nationalId || profile?.identityCardNumber || ''} />
                )}
                {Boolean(fullAddress) && <ConfirmationField label="Địa chỉ" value={fullAddress || ''} />}
                {Boolean(draft.symptoms) && <ConfirmationField label="Triệu chứng / Ghi chú" value={draft.symptoms || ''} />}
              </View>
            </View>
          </View>

          {/* Dải phân cách xám dày */}
          <View className="h-2 bg-slate-100 border-y border-slate-200/60" />

          {/* 3. ADD CODE OR GIFT CARD (Mã giảm giá & Ưu đãi nằm trên Order Summary) */}
          <View className="bg-white">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsCodeExpanded(!isCodeExpanded)}
              className="p-4 flex-row items-center justify-between"
            >
              <Text className="text-sm font-bold text-slate-900">
                Add Code or Gift Card
              </Text>
              <Ionicons
                name={isCodeExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#334155"
              />
            </TouchableOpacity>

            {isCodeExpanded && (
              <View className="px-4 pb-4 pt-1">
                {appliedVoucher ? (
                  <View className="flex-row items-center justify-between bg-primary-50 border border-primary-200 rounded-md p-3">
                    <View className="flex-row items-center flex-1 pr-2">
                      <Ionicons name="ticket-outline" size={18} color="#28a745" style={{ marginRight: 8 }} />
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-primary-950">
                          Mã: {appliedVoucher.code}
                        </Text>
                        <Text className="text-[11px] font-semibold text-primary-700 mt-0.5">
                          Đã giảm - {formatCurrencyVi(appliedVoucher.discountAmount)}
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
                  <View>
                    <View className="flex-row items-center gap-2 mb-2">
                      <TextInput
                        value={inputCode}
                        onChangeText={setInputCode}
                        placeholder="Nhập mã ưu đãi (VD: VITACARE50)"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="characters"
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5 text-xs text-slate-800"
                      />
                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={isValidating || !inputCode.trim()}
                        onPress={() => handleApplyVoucherCode(inputCode)}
                        className={`px-4 py-2.5 rounded-md items-center justify-center ${inputCode.trim() ? 'bg-primary-600 active:bg-primary-700' : 'bg-slate-200'
                          }`}
                      >
                        {isValidating ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : (
                          <Text
                            className={`text-xs font-bold ${inputCode.trim() ? 'text-white' : 'text-slate-400'
                              }`}
                          >
                            Áp dụng
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>

                    {availableVouchers.length > 0 ? (
                      <View className="flex-row flex-wrap gap-1.5 mt-1">
                        {availableVouchers.slice(0, 4).map((v) => (
                          <TouchableOpacity
                            key={v.id || v.code}
                            activeOpacity={0.7}
                            onPress={() => handleApplyVoucherCode(v.code)}
                            className="border border-dashed border-primary-300 bg-primary-50/50 px-2 py-1 rounded flex-row items-center gap-1"
                          >
                            <Ionicons name="pricetag-outline" size={10} color="#28a745" />
                            <Text className="text-[11px] font-bold text-primary-800">{v.code}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View className="flex-row gap-1.5 mt-1">
                        <TouchableOpacity
                          onPress={() => handleApplyVoucherCode('VITACARE50')}
                          className="border border-dashed border-slate-300 bg-slate-50 px-2 py-1 rounded"
                        >
                          <Text className="text-[11px] font-semibold text-slate-600">Gợi ý: VITACARE50</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Dải phân cách xám dày */}
          <View className="h-2 bg-slate-100 border-y border-slate-200/60" />

          {/* 4. ORDER SUMMARY (Chi tiết thanh toán viện phí nằm dưới Voucher) */}
          <View className="p-4 bg-white">
            <Text className="text-base font-extrabold text-slate-900 mb-2.5">
              Order Summary
            </Text>

            <View className="space-y-2">
              <View className="flex-row justify-between items-center py-0.5">
                <Text className="text-xs font-medium text-slate-600">Subtotal:</Text>
                <Text className="text-xs font-bold text-slate-800">
                  {formatCurrencyVi(subtotal)}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-0.5">
                <Text className="text-xs font-medium text-slate-600">Phí tiện ích:</Text>
                <Text className="text-xs font-bold text-slate-800">
                  {formatCurrencyVi(serviceFee)}
                </Text>
              </View>

              {discountAmount > 0 && (
                <View className="flex-row justify-between items-center py-0.5">
                  <Text className="text-xs font-medium text-primary-700">Giảm giá voucher:</Text>
                  <Text className="text-xs font-bold text-primary-700">
                    - {formatCurrencyVi(discountAmount)}
                  </Text>
                </View>
              )}

              <View className="border-t border-slate-200 mt-2 pt-2.5 flex-row justify-between items-center">
                <Text className="text-base font-extrabold text-slate-900">Total</Text>
                <Text className="text-base font-black text-slate-900">
                  {formatCurrencyVi(totalAmount)}
                </Text>
              </View>
            </View>
          </View>


        </ScrollView>

        {/* Cố định Bottom Bar: Giống các step trước */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3">
          <Button
            title="Tiến hành thanh toán"
            onPress={() => router.push('/booking/payment')}
            className="py-3 rounded-lg w-full"
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
