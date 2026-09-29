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
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useBookingStore } from '../../src/store/useBookingStore'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useNotifications } from '../../src/hooks/useNotifications'
import { appointmentService } from '../../src/services/appointmentService'
import { doctorService } from '../../src/services/doctorService'
import { api } from '../../src/services/api'
import { formatCurrencyVi } from '../../src/utils/date'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'
import { BookingTimeline } from '../../src/components/booking/BookingTimeline'

type PaymentMethodType = 'MOMO' | 'VIETQR' | 'COUNTER'

export default function BookingPaymentScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { draft, resetBooking } = useBookingStore()
  const { scheduleAppointmentReminder } = useNotifications()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('MOMO')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isPackage = draft.bookingMethod === 'HEALTH_PACKAGE' || Boolean(draft.healthPackage)
  const serviceName = isPackage
    ? draft.healthPackage?.name || 'Gói khám sức khỏe'
    : draft.doctor?.full_name || draft.doctor?.fullName || draft.doctor?.name || 'Bác sĩ chuyên khoa'

  const subtotal = isPackage
    ? Number(draft.healthPackage?.price ?? 1200000)
    : Number(draft.doctor?.price || draft.doctor?.consultation_fee || 300000)

  const discountAmount = draft.appliedVoucher?.discountAmount || 0
  const totalAmount = Math.max(0, subtotal - discountAmount)

  // Handle final checkout and payment
  const handlePayment = async () => {
    try {
      setIsSubmitting(true)

      const profileId = draft.patientProfileId || draft.selectedProfile?.id
      if (!profileId) {
        throw new Error('Chưa xác định hồ sơ người khám bệnh.')
      }

      // Resolve slot ID
      let slotId = draft.slotId
      if (!slotId) {
        if (draft.doctor?.id) {
          const slots = await doctorService.getAvailability(draft.doctor.id, draft.date, draft.branchId)
          const target = slots.find((s) => s.startTime?.slice(0, 5) === draft.slot.slice(0, 5))
          slotId = target?.id
        } else if (draft.healthPackage?.id) {
          const slots = await doctorService.getPackageTimeslots(draft.healthPackage.id, draft.date, draft.branchId)
          const target = slots.find((s) => s.startTime?.slice(0, 5) === draft.slot.slice(0, 5))
          slotId = target?.id
        }
      }

      if (!slotId) {
        throw new Error('Không thể xác định khung giờ khám. Vui lòng quay lại bước 1 chọn lại giờ.')
      }

      // 1. Call checkout API
      const result = await appointmentService.checkout({
        bookingType: isPackage ? 'SERVICE_PACKAGE' : 'DOCTOR',
        patientProfileId: profileId,
        scheduleSlotId: slotId,
        servicePackageId: isPackage ? String(draft.healthPackage?.id) : undefined,
        voucherCode: draft.voucherCode,
      })

      const appointmentId =
        result?.appointmentId ||
        (result as any)?.id ||
        (result as any)?.appointment?.id ||
        'new'

      const paymentId = result?.paymentId

      // 2. If MoMo or VietQR: trigger payment confirmation / simulation
      if (paymentMethod === 'MOMO' && paymentId) {
        try {
          await api.post('/api/v1/payments/momo/simulate-success', { paymentId })
        } catch {
          // Continue if simulation fails
        }
      } else if (paymentMethod === 'VIETQR' && paymentId) {
        try {
          await api.post('/api/v1/payments/momo/simulate-success', { paymentId })
        } catch {}
      }

      // 3. Set notification reminder
      const appointmentDateObj = new Date(draft.date)
      const reminderDate = new Date(appointmentDateObj.getTime() - 24 * 60 * 60 * 1000)
      scheduleAppointmentReminder(
        appointmentId,
        serviceName,
        `${draft.slot} ngày ${draft.date}`,
        reminderDate
      )

      // 4. Reset booking store & navigate to Ticket pass
      resetBooking()
      router.replace(`/booking/${appointmentId}`)
    } catch (err: any) {
      Alert.alert('Thanh toán thất bại', err.message || 'Không thể tạo đơn đặt lịch khám. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const METHODS = [
    {
      id: 'MOMO' as PaymentMethodType,
      title: 'Ví điện tử MoMo',
      desc: 'Thanh toán trực tuyến an toàn qua ví MoMo',
      badge: 'Khuyên dùng',
      icon: 'wallet-outline',
      iconColor: '#ec4899',
    },
    {
      id: 'VIETQR' as PaymentMethodType,
      title: 'Chuyển khoản ngân hàng (VietQR)',
      desc: 'Quét mã QR chuyển khoản nhanh 24/7 từ mọi ngân hàng',
      badge: null,
      icon: 'qr-code-outline',
      iconColor: '#059669',
    },
    {
      id: 'COUNTER' as PaymentMethodType,
      title: 'Thanh toán tại quầy tiếp đón',
      desc: 'Thanh toán tiền mặt hoặc quẹt thẻ khi đến phòng khám',
      badge: null,
      icon: 'cash-outline',
      iconColor: '#0284c7',
    },
  ]

  return (
    <ScreenShell showBackButton title="Tiến hành thanh toán">
      <BookingTimeline currentStep={4} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-slate-50"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 }}
        >
          {/* Card 1: Số tiền thanh toán */}
          <View className="bg-white border border-slate-200/90 rounded-lg p-4 mb-3.5 shadow-2xs">
            <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              Tổng chi phí thanh toán
            </Text>
            <Text className="text-2xl font-black text-emerald-800 my-1">
              {formatCurrencyVi(totalAmount)}
            </Text>
            <View className="flex-row items-center gap-2 mt-1">
              <Text className="text-xs text-slate-600 font-medium">
                {serviceName}
              </Text>
              <Text className="text-slate-300">•</Text>
              <Text className="text-xs text-slate-500">
                {draft.slot} ngày {draft.date}
              </Text>
            </View>
            {discountAmount > 0 && (
              <View className="mt-2 pt-2 border-t border-slate-100 flex-row items-center justify-between">
                <Text className="text-xs text-emerald-700 font-medium">
                  Đã áp dụng mã {draft.voucherCode || 'Ưu đãi'}:
                </Text>
                <Text className="text-xs font-bold text-emerald-700">
                  - {formatCurrencyVi(discountAmount)}
                </Text>
              </View>
            )}
          </View>

          {/* Card 2: Chọn phương thức thanh toán */}
          <View className="bg-white border border-slate-200/90 rounded-lg p-4 mb-3.5 shadow-2xs">
            <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Chọn phương thức thanh toán *
            </Text>

            <View className="gap-2.5">
              {METHODS.map((m) => {
                const isSelected = paymentMethod === m.id
                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.8}
                    onPress={() => setPaymentMethod(m.id)}
                    className="p-3.5 rounded-lg border border-slate-200/90 bg-white"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 pr-2">
                        <View className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 items-center justify-center mr-3">
                          <Ionicons name={m.icon as any} size={22} color={m.iconColor} />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center gap-2 flex-wrap">
                            <Text className="text-xs font-bold text-slate-900">
                              {m.title}
                            </Text>
                            {Boolean(m.badge) && (
                              <View className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200">
                                <Text className="text-[9px] font-bold text-amber-700">{m.badge}</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-2xs text-slate-500 mt-0.5">
                            {m.desc}
                          </Text>
                        </View>
                      </View>

                      {/* Selected line checkmark */}
                      {isSelected ? (
                        <Ionicons name="checkmark" size={20} color="#059669" />
                      ) : (
                        <View className="w-5" />
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Card 3: Thông tin chuyển khoản VietQR nếu chọn VIETQR */}
          {paymentMethod === 'VIETQR' && (
            <View className="bg-white border border-slate-200/90 rounded-lg p-4 mb-3.5 shadow-2xs">
              <View className="flex-row items-center gap-2 mb-2.5">
                <Ionicons name="information-circle-outline" size={18} color="#059669" />
                <Text className="text-xs font-bold text-slate-900">
                  Thông tin tài khoản nhận chuyển khoản
                </Text>
              </View>

              <View className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-200/80">
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-xs text-slate-500">Ngân hàng:</Text>
                  <Text className="text-xs font-bold text-slate-800">MB Bank (Quân Đội)</Text>
                </View>
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-xs text-slate-500">Số tài khoản:</Text>
                  <Text className="text-xs font-extrabold text-emerald-800 tracking-wider">
                    0987654321
                  </Text>
                </View>
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-xs text-slate-500">Chủ tài khoản:</Text>
                  <Text className="text-xs font-semibold text-slate-800">
                    PHONG KHAM DA KHOA VITACARE
                  </Text>
                </View>
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-xs text-slate-500">Số tiền:</Text>
                  <Text className="text-xs font-bold text-slate-900">
                    {formatCurrencyVi(totalAmount)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-xs text-slate-500">Nội dung:</Text>
                  <Text className="text-xs font-bold text-emerald-700">
                    VITACARE {user?.phone || 'KHAM'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Card 4: Cam kết y tế & Lưu ý */}
          <View className="bg-white border border-slate-200/90 rounded-lg p-3.5 mb-2 shadow-2xs">
            <View className="flex-row items-start gap-2">
              <Ionicons name="shield-checkmark-outline" size={16} color="#059669" style={{ marginTop: 1 }} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-800">
                  Cam kết bảo mật & Quyền lợi khám
                </Text>
                <Text className="text-2xs text-slate-500 mt-0.5 leading-relaxed">
                  Vé hẹn điện tử kèm mã QR check-in tiếp đón ưu tiên sẽ được phát hành ngay sau khi bạn xác nhận.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Bar: Xác nhận thanh toán */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-[11px] text-slate-400 font-medium">Tổng thanh toán:</Text>
            <Text className="text-base font-extrabold text-emerald-800 leading-tight">
              {formatCurrencyVi(totalAmount)}
            </Text>
          </View>

          <View className="w-[180px]">
            <Button
              title="Xác nhận thanh toán"
              onPress={handlePayment}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="py-3 rounded-lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
