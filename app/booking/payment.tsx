import React, { useState } from 'react'
import {
  Alert,
  Image,
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
import {
  paymentService,
  PayosCreatePaymentResponse,
} from '../../src/services/paymentService'
import { formatCurrencyVi } from '../../src/utils/date'
import { VietQrLogo } from '../../src/components/common/VietQrLogo'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'
import { BookingTimeline } from '../../src/components/booking/BookingTimeline'
import { PayosDeepLinkModal } from '../../src/components/booking/PayosDeepLinkModal'
import { useBehaviorTracker } from '../../src/hooks/useBehaviorTracker'

type PaymentMethodType = 'PAYOS' | 'VIETQR' | 'COUNTER'

export default function BookingPaymentScreen() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { draft, resetBooking } = useBookingStore()
  const { scheduleAppointmentReminder } = useNotifications()
  const { trackDropOff } = useBehaviorTracker()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [payosData, setPayosData] = useState<PayosCreatePaymentResponse | null>(null)
  const [createdApptId, setCreatedApptId] = useState<string | null>(null)
  const [isPayosModalVisible, setIsPayosModalVisible] = useState(false)

  const isPackage = draft.bookingMethod === 'HEALTH_PACKAGE' || Boolean(draft.healthPackage)
  const serviceName = isPackage
    ? draft.healthPackage?.name || 'Gói khám sức khỏe'
    : draft.doctor?.full_name || draft.doctor?.fullName || draft.doctor?.name || 'Bác sĩ chuyên khoa'

  const subtotal = isPackage
    ? Number(draft.healthPackage?.price ?? 1200000)
    : Number(draft.doctor?.price || draft.doctor?.consultation_fee || 300000)

  const discountAmount = draft.appliedVoucher?.discountAmount || 0
  const totalAmount = Math.max(0, subtotal - discountAmount)

  // Xử lý khi thanh toán PayOS thành công
  const handlePaymentSuccess = () => {
    setIsPayosModalVisible(false)
    const targetId = createdApptId || 'new'

    // Đặt lịch nhắc thông báo
    const appointmentDateObj = new Date(draft.date)
    const reminderDate = new Date(appointmentDateObj.getTime() - 24 * 60 * 60 * 1000)
    scheduleAppointmentReminder(
      targetId,
      serviceName,
      `${draft.slot} ngày ${draft.date}`,
      reminderDate
    )

    resetBooking()
    router.replace(`/booking/${targetId}`)
  }

  // Handle final checkout and payment
  const handlePayment = async () => {
    try {
      if (!paymentMethod) {
        Alert.alert('Chưa chọn phương thức thanh toán', 'Vui lòng chọn một phương thức thanh toán để tiếp tục.')
        return
      }

      setIsSubmitting(true)

      const profileId = draft.patientProfileId || draft.selectedProfile?.id
      if (!profileId) {
        throw new Error('Chưa xác định hồ sơ người khám bệnh.')
      }

      // slotId phải được lưu sẵn khi chọn giờ ở bước 2
      const slotId = draft.slotId
      if (!slotId) {
        Alert.alert(
          'Cần chọn lại giờ khám',
          'Thông tin khung giờ bị thiếu. Vui lòng quay lại bước chọn ngày & giờ và chọn lại.',
          [{ text: 'Quay lại', onPress: () => router.back() }]
        )
        return
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

      // 2. Nếu chọn PayOS / VietQR: Khởi tạo phiên thanh toán PayOS thật & mở Modal Deep Link
      if (paymentMethod === 'PAYOS' || paymentMethod === 'VIETQR') {
        try {
          const payosRes = await paymentService.createPayosPayment({
            appointmentId,
            amount: totalAmount,
            description: `VC${String(appointmentId).slice(-6).toUpperCase()}`,
          })

          setCreatedApptId(appointmentId)
          setPayosData(payosRes)
          setIsPayosModalVisible(true)
        } catch (payErr: any) {
          Alert.alert(
            'Không thể tạo mã thanh toán',
            payErr?.message || 'Có lỗi khi kết nối cổng PayOS. Vui lòng thử lại hoặc chọn thanh toán tại quầy.',
          )
        }
        return
      }

      // 3. Nếu chọn thanh toán tại quầy (COUNTER): Hoàn tất trực tiếp
      const appointmentDateObj = new Date(draft.date)
      const reminderDate = new Date(appointmentDateObj.getTime() - 24 * 60 * 60 * 1000)
      scheduleAppointmentReminder(
        appointmentId,
        serviceName,
        `${draft.slot} ngày ${draft.date}`,
        reminderDate
      )

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
      id: 'PAYOS' as PaymentMethodType,
      title: 'Cổng thanh toán PayOS (VietQR)',
      desc: 'Quét mã VietQR hoặc mở thẳng App Ngân hàng 24/7',
      badge: 'Khuyên dùng',
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
          {/* Card: Chọn phương thức thanh toán */}
          <View className="bg-white border border-slate-200/90 rounded-lg p-4 mb-3.5 shadow-2xs">
            <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Phương thức thanh toán *
            </Text>

            <View className="gap-2.5">
              {METHODS.map((m) => {
                const isSelected = paymentMethod === m.id
                return (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.8}
                    onPress={() => setPaymentMethod(m.id)}
                    className={`p-3.5 rounded-lg border transition-all ${isSelected
                        ? 'border-slate-900 bg-slate-50/60'
                        : 'border-slate-200 bg-white'
                      }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 pr-2">
                        {/* Official VietQR Logo */}
                        <View className="w-14 h-10 rounded bg-white border border-slate-200 items-center justify-center mr-3 px-1.5 shadow-2xs">
                          <VietQrLogo width={48} height={15} />
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

                      {/* Radio Selection */}
                      {isSelected ? (
                        <View className="w-5 h-5 rounded-full bg-slate-900 items-center justify-center">
                          <Ionicons name="checkmark" size={13} color="#ffffff" />
                        </View>
                      ) : (
                        <View className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Card: Cam kết y tế & Lưu ý */}
          <View className="bg-white border border-slate-200/90 rounded-lg p-3.5 mb-2 shadow-2xs">
            <View className="flex-row items-start gap-2">
              <Ionicons name="shield-checkmark-outline" size={16} color="#475569" style={{ marginTop: 1 }} />
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
            <Text className="text-base font-extrabold text-slate-900 leading-tight">
              {formatCurrencyVi(totalAmount)}
            </Text>
          </View>

          <View className="w-[180px]">
            <Button
              title="Xác nhận thanh toán"
              onPress={handlePayment}
              isLoading={isSubmitting}
              disabled={isSubmitting || !paymentMethod}
              className="py-3 rounded-lg"
            />
          </View>
        </View>

        {/* Modal Quét mã VietQR & Mở thẳng App Ngân hàng (Deep Linking) */}
        <PayosDeepLinkModal
          visible={isPayosModalVisible}
          onClose={() => {
            setIsPayosModalVisible(false)
            void trackDropOff(
              draft.healthPackage?.id,
              draft.specialty?.id || draft.healthPackage?.specialtyId
            )
          }}
          appointmentId={createdApptId || ''}
          paymentData={payosData}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
