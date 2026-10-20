import { useRef, useState } from 'react'
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
import { useNotifications } from '../../src/hooks/useNotifications'
import { appointmentService } from '../../src/services/appointmentService'
import { patientProfileService } from '../../src/services/patientProfileService'
import {
  paymentService,
  PayosCreatePaymentResponse,
} from '../../src/services/paymentService'
import { VietQrLogo } from '../../src/components/common/VietQrLogo'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'
import { BookingTimeline } from '../../src/components/booking/BookingTimeline'
import { PayosDeepLinkModal } from '../../src/components/booking/PayosDeepLinkModal'
import { searchAnalytics } from '../../src/services/searchAnalytics'
import { useBehaviorTracker } from '../../src/hooks/useBehaviorTracker'

type PaymentMethodType = 'PAYOS'

export default function BookingPaymentScreen() {
  const router = useRouter()
  const { draft, resetBooking } = useBookingStore()
  const { scheduleAppointmentReminder } = useNotifications()
  const { trackDropOff } = useBehaviorTracker()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [payosData, setPayosData] = useState<PayosCreatePaymentResponse | null>(null)
  const [createdApptId, setCreatedApptId] = useState<string | null>(null)
  const [isPayosModalVisible, setIsPayosModalVisible] = useState(false)
  const redirectedRef = useRef(false)

  const isPackage = draft.bookingMethod === 'HEALTH_PACKAGE' || Boolean(draft.healthPackage)
  const serviceName = isPackage
    ? draft.healthPackage?.name || 'Gói khám sức khỏe'
    : draft.doctor?.full_name || draft.doctor?.fullName || draft.doctor?.name || 'Bác sĩ chuyên khoa'

  const subtotal = isPackage
    ? Number(draft.healthPackage?.price ?? 1200000)
    : Number(
        draft.bookingMethod === 'ONLINE_CONSULTATION'
          ? draft.doctor?.onlineConsultationFee ||
              draft.doctor?.consultation_fee ||
              draft.doctor?.price ||
              300000
          : draft.doctor?.price || draft.doctor?.consultation_fee || 300000
      )

  const serviceFee = 10000
  const discountAmount = draft.appliedVoucher?.discountAmount || 0
  const totalAmount = Math.max(0, subtotal + serviceFee - discountAmount)

  // Xử lý khi thanh toán PayOS thành công
  const handlePaymentSuccess = () => {
    if (!createdApptId || redirectedRef.current) return
    redirectedRef.current = true
    setIsPayosModalVisible(false)
    const targetId = createdApptId

    // Đặt lịch nhắc thông báo
    const appointmentDateObj = new Date(draft.date)
    const reminderDate = new Date(appointmentDateObj.getTime() - 24 * 60 * 60 * 1000)
    void scheduleAppointmentReminder(
      targetId,
      serviceName,
      `${draft.slot} ngày ${draft.date}`,
      reminderDate
    ).catch(() => { /* Reminder failure must not block opening the ticket. */ })

    resetBooking()
    router.replace(`/booking/${targetId}`)
  }

  // Handle final checkout and payment
  const handlePayment = async () => {
    if (createdApptId && payosData) {
      setIsPayosModalVisible(true)
      return
    }
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
      const profiles = await patientProfileService.getPatientProfiles()
      if (!profiles.some((profile) => String(profile.id) === String(profileId))) {
        useBookingStore.setState((state) => ({
          draft: { ...state.draft, patientProfileId: undefined, selectedProfile: undefined },
        }))
        Alert.alert(
          'Cần chọn lại hồ sơ',
          'Hồ sơ người khám chưa được lưu hoặc không thuộc tài khoản hiện tại. Vui lòng chọn lại và lưu hồ sơ.',
          [{ text: 'Chọn hồ sơ', onPress: () => router.replace('/booking/patient-info') }],
        )
        return
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
        ...await searchAnalytics.checkoutSource({
          packageId: String((isPackage ? draft.healthPackage?.id : draft.specialtyService?.id) || '') || undefined,
          doctorId: draft.doctor?.id ? String(draft.doctor.id) : undefined, branchId: draft.branchId,
        }).catch(() => ({})),
        bookingMethodCode: draft.bookingMethod || (isPackage ? 'HEALTH_PACKAGE' : 'CONSULTATION'),
        patientProfileId: profileId,
        scheduleSlotId: slotId,
        servicePackageId: isPackage
          ? draft.healthPackage?.id ? String(draft.healthPackage.id) : undefined
          : draft.specialtyService?.id ? String(draft.specialtyService.id) : undefined,
        symptomsDescription: draft.symptoms,
        voucherCode: draft.voucherCode,
      })

      const appointmentId =
        result?.appointmentId ||
        (result as any)?.id ||
        (result as any)?.appointment?.id
      if (!appointmentId) throw new Error('Máy chủ chưa trả về mã lịch hẹn. Vui lòng kiểm tra lịch đã đặt.')

      // Open the PayOS session; finish the booking only after payment succeeds.
      try {
        const payosRes = await paymentService.createPayosPayment({
          appointmentId,
          amount: totalAmount,
          description: `VC${String(appointmentId).slice(-6).toUpperCase()}`,
        })
        redirectedRef.current = false
        setCreatedApptId(appointmentId)
        setPayosData(payosRes)
        setIsPayosModalVisible(true)
      } catch (payErr: any) {
        Alert.alert('Không thể tạo mã thanh toán', payErr?.message || 'Có lỗi khi kết nối cổng PayOS. Vui lòng thử lại.')
      }
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
                    className={`p-3.5 rounded-lg border border-slate-200/90 transition-all ${
                      isSelected ? 'bg-[#28a745]/[0.06]' : 'bg-white'
                    }`}
                    style={isSelected ? { backgroundColor: 'rgba(40, 167, 69, 0.06)' } : { backgroundColor: '#ffffff' }}
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
                        <View
                          className="w-5 h-5 rounded-full items-center justify-center bg-[#28a745]"
                          style={{ backgroundColor: '#28a745' }}
                        >
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
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3">
            <Button
              title={createdApptId && payosData ? 'Tiếp tục thanh toán' : 'Xác nhận'}
              singleLine
              onPress={handlePayment}
              isLoading={isSubmitting}
              disabled={isSubmitting || !paymentMethod}
              className="px-3 py-3 rounded-lg"
            />
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
