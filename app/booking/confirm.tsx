import { useState, useEffect, useMemo, useRef } from 'react'
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
  const [isCodeExpanded, setIsCodeExpanded] = useState(false)
  const hasAutoAppliedRef = useRef(false)

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
  const { data: availableVouchers = [], isLoading: loadingVouchers } = useQuery({
    queryKey: ['vouchers-available'],
    queryFn: () => voucherService.getAvailableVouchers(),
    staleTime: 5 * 60 * 1000, // cache 5 phút
  })

  // Helper tính mức giảm giá của voucher theo giá trị đơn subtotal
  const calculateVoucherDiscount = (v: any, amount: number) => {
    if (v.discountType === 'PERCENTAGE') {
      const calculated = (amount * Number(v.discountValue)) / 100
      return v.maxDiscount ? Math.min(calculated, Number(v.maxDiscount)) : calculated
    }
    return Number(v.discountValue)
  }

  // Tự động tìm voucher tối ưu nhất (giảm nhiều tiền nhất & đủ điều kiện)
  const bestVoucher = useMemo(() => {
    if (!availableVouchers.length || subtotal <= 0) return null
    const eligible = availableVouchers.filter((v: any) => !v.minOrderValue || subtotal >= Number(v.minOrderValue))
    if (!eligible.length) return null

    let best = eligible[0]
    let maxDiscount = calculateVoucherDiscount(best, subtotal)
    for (let i = 1; i < eligible.length; i++) {
      const discount = calculateVoucherDiscount(eligible[i], subtotal)
      if (discount > maxDiscount) {
        maxDiscount = discount
        best = eligible[i]
      }
    }
    return maxDiscount > 0 ? { voucher: best, discountAmount: maxDiscount } : null
  }, [availableVouchers, subtotal])

  // Tự động ưu tiên chọn voucher tốt nhất cho người dùng khi tải xong
  useEffect(() => {
    if (bestVoucher && !hasAutoAppliedRef.current && !draft.appliedVoucher && !draft.voucherCode) {
      hasAutoAppliedRef.current = true
      setAppliedVoucher({
        code: bestVoucher.voucher.code,
        name: bestVoucher.voucher.name,
        discountAmount: bestVoucher.discountAmount,
        discountType: bestVoucher.voucher.discountType,
        discountValue: bestVoucher.voucher.discountValue,
      })
      setVoucherCode(bestVoucher.voucher.code)
    }
  }, [bestVoucher, draft.appliedVoucher, draft.voucherCode])


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

          {/* 3. MÃ GIẢM GIÁ & ƯU ĐÃI (Load trực tiếp từ backend) */}
          <View className="bg-white">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsCodeExpanded(!isCodeExpanded)}
              className="p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-2 flex-1 pr-2 flex-wrap">
                <Ionicons name="pricetag-outline" size={16} color="#28a745" />
                <Text className="text-sm font-bold text-slate-900">
                  {appliedVoucher ? 'Mã ưu đãi:' : 'Mã ưu đãi & Voucher giảm giá'}
                </Text>
                {appliedVoucher && (
                  <View
                    className="flex-row items-center gap-1 px-2 py-0.5 rounded border border-[#28a745]/30"
                    style={{ backgroundColor: 'rgba(40, 167, 69, 0.08)' }}
                  >
                    <Text className="text-xs font-bold text-slate-900">
                      {appliedVoucher.code}
                    </Text>
                    <Text className="text-xs font-bold text-[#28a745]">
                      (-{formatCurrencyVi(appliedVoucher.discountAmount)})
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons
                name={isCodeExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#334155"
              />
            </TouchableOpacity>

            {isCodeExpanded && (
              <View className="px-4 pb-4 pt-1">

                {/* Nhập mã thủ công */}
                <View className="flex-row items-center gap-2 mb-2">
                  <TextInput
                    value={inputCode}
                    onChangeText={setInputCode}
                    placeholder="Nhập mã ưu đãi (VD: CHAOBANMOI)"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-800"
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isValidating || !inputCode.trim()}
                    onPress={() => handleApplyVoucherCode(inputCode)}
                    className={`px-4 py-2.5 rounded-md items-center justify-center ${
                      inputCode.trim() ? 'bg-[#28a745] active:bg-[#218838]' : 'bg-slate-200'
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

                {/* Danh sách Voucher tải trực tiếp từ backend khi click mở accordion */}
                <View className="mt-2 pt-2 border-t border-slate-100">
                  <Text className="text-[11px] font-bold text-slate-700 mb-2">
                    Ưu đãi khả dụng từ hệ thống:
                  </Text>

                  {loadingVouchers ? (
                    <View className="flex-row items-center justify-center py-3 gap-2">
                      <ActivityIndicator size="small" color="#28a745" />
                      <Text className="text-xs text-slate-500">Đang tải mã giảm giá...</Text>
                    </View>
                  ) : availableVouchers.length === 0 ? (
                    <Text className="text-xs text-slate-400 py-1">Hiện chưa có mã ưu đãi khả dụng.</Text>
                  ) : (
                    <View className="gap-2">
                      {availableVouchers.map((v) => {
                        const isCurrent = appliedVoucher?.code === v.code
                        const isBest = bestVoucher?.voucher.code === v.code
                        const minOrder = Number(v.minOrderValue || 0)
                        const isEligible = !minOrder || subtotal >= minOrder
                        const discountBadge =
                          v.discountType === 'PERCENTAGE'
                            ? `Giảm ${v.discountValue}%${v.maxDiscount ? ` (tối đa ${formatCurrencyVi(Number(v.maxDiscount))})` : ''}`
                            : `Giảm ${formatCurrencyVi(Number(v.discountValue))}`

                        return (
                          <TouchableOpacity
                            key={v.id || v.code}
                            activeOpacity={isEligible ? 0.7 : 1}
                            disabled={isValidating || !isEligible}
                            onPress={() => {
                              if (isCurrent) {
                                handleRemoveVoucher()
                              } else {
                                handleApplyVoucherCode(v.code)
                              }
                            }}
                            className={`p-3 rounded-lg border border-slate-200/90 transition-all ${
                              isCurrent
                                ? 'bg-[#28a745]/[0.06]'
                                : isEligible
                                  ? 'bg-white'
                                  : 'bg-slate-50/80 opacity-60'
                            }`}
                            style={isCurrent ? { backgroundColor: 'rgba(40, 167, 69, 0.06)' } : { backgroundColor: '#ffffff' }}
                          >
                            <View className="flex-row items-center justify-between gap-2">
                              <View className="flex-1 pr-2">
                                <View className="flex-row items-center gap-1.5 flex-wrap">
                                  <Text className="text-xs font-bold text-slate-900 tracking-wide">
                                    {v.code}
                                  </Text>
                                  <View className="bg-[#28a745]/10 px-2 py-0.5 rounded border border-[#28a745]/20">
                                    <Text className="text-[10px] font-bold text-[#28a745]">
                                      {discountBadge}
                                    </Text>
                                  </View>
                                  {isBest && (
                                    <View className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                      <Text className="text-[9px] font-bold text-amber-700">Tốt nhất</Text>
                                    </View>
                                  )}
                                </View>
                                {Boolean(v.description || v.name) && (
                                  <Text className="text-[11px] text-slate-600 mt-1 leading-4">
                                    {v.description || v.name}
                                  </Text>
                                )}
                                {minOrder > 0 && (
                                  <Text className="text-[10px] text-slate-400 mt-0.5">
                                    Đơn tối thiểu: {formatCurrencyVi(minOrder)}
                                  </Text>
                                )}
                              </View>

                              {/* Radio Selection Status */}
                              <View className="self-center">
                                {isCurrent ? (
                                  <View
                                    className="w-5 h-5 rounded-full items-center justify-center bg-[#28a745]"
                                    style={{ backgroundColor: '#28a745' }}
                                  >
                                    <Ionicons name="checkmark" size={13} color="#ffffff" />
                                  </View>
                                ) : isEligible ? (
                                  <View className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                                ) : (
                                  <Text className="text-[10px] font-semibold text-slate-400">Chưa đủ ĐK</Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* Dải phân cách xám dày */}
          <View className="h-2 bg-slate-100 border-y border-slate-200/60" />

          {/* 4. CHI TIẾT THANH TOÁN (Nằm dưới Voucher) */}
          <View className="p-4 bg-white">
            <Text className="text-sm font-bold text-slate-900 mb-3">
              Chi tiết thanh toán
            </Text>

            <View className="gap-y-2">
              <View className="flex-row justify-between items-center py-0.5">
                <Text className="text-xs text-slate-600">Tạm tính:</Text>
                <Text className="text-xs font-semibold text-slate-900">
                  {formatCurrencyVi(subtotal)}
                </Text>
              </View>

              <View className="flex-row justify-between items-center py-0.5">
                <Text className="text-xs text-slate-600">Phí tiện ích:</Text>
                <Text className="text-xs font-semibold text-slate-900">
                  {serviceFee > 0 ? formatCurrencyVi(serviceFee) : 'Miễn phí'}
                </Text>
              </View>

              {discountAmount > 0 && (
                <View className="flex-row justify-between items-center py-0.5">
                  <Text className="text-xs font-medium text-[#28a745]">Giảm giá voucher:</Text>
                  <Text className="text-xs font-bold text-[#28a745]">
                    - {formatCurrencyVi(discountAmount)}
                  </Text>
                </View>
              )}

              <View
                className="pt-2.5 mt-1 flex-row justify-between items-center"
                style={{ borderTopWidth: 1, borderTopColor: '#e2e8f0' }}
              >
                <Text className="text-sm font-bold text-slate-900">Tổng thanh toán:</Text>
                <Text className="text-base font-bold text-slate-900">
                  {formatCurrencyVi(totalAmount)}
                </Text>
              </View>
            </View>
          </View>


        </ScrollView>

        {/* Cố định Bottom Bar: Giống các step trước */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3">
          <Button
            title="Thanh toán"
            onPress={() => router.push('/booking/payment')}
            className="py-3 rounded-lg w-full"
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
