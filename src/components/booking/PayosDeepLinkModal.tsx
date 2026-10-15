import { useState, useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  AppState,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import QRCode from 'react-native-qrcode-svg'
import {
  POPULAR_BANKS,
  BankAppItem,
  openBankApp,
} from '../../utils/vietqrDeepLink'
import {
  paymentService,
  PayosCreatePaymentResponse,
} from '../../services/paymentService'
import { formatCurrencyVi } from '../../utils/date'
import { VietQrLogo } from '../common/VietQrLogo'

export interface PayosDeepLinkModalProps {
  visible: boolean
  onClose: () => void
  appointmentId: string
  paymentData: PayosCreatePaymentResponse | null
  onPaymentSuccess: () => void
}

export function PayosDeepLinkModal({
  visible,
  onClose,
  appointmentId,
  paymentData,
  onPaymentSuccess,
}: PayosDeepLinkModalProps) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const modalHeight = Math.min(height * 0.92, height - insets.top - 12)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const openingBankRef = useRef(false)
  const [countdown, setCountdown] = useState(0)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const successHandledRef = useRef(false)
  const successCallbackRef = useRef(onPaymentSuccess)
  successCallbackRef.current = onPaymentSuccess
  const sessionRef = useRef(0)

  // Đếm theo hạn giữ chỗ của backend, kể cả khi quay về từ app ngân hàng.
  useEffect(() => {
    if (!visible || !paymentData?.holdExpiresAt) {
      setCountdown(0)
      return
    }
    const expiresAt = Date.parse(paymentData.holdExpiresAt)
    const updateCountdown = () => {
      setCountdown(Number.isFinite(expiresAt)
        ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
        : 0)
    }
    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateCountdown()
    })
    return () => {
      clearInterval(timer)
      subscription.remove()
    }
  }, [visible, paymentData?.holdExpiresAt])

  // Check immediately and reconcile when returning from a bank/browser.
  useEffect(() => {
    const session = ++sessionRef.current
    successHandledRef.current = false
    setIsSuccess(false)
    setIsChecking(false)
    if (!visible || !appointmentId) return
    let disposed = false
    let inFlight = false
    let reconcilePending = false
    let checks = 0
    const checkStatus = async (reconcile = false) => {
      if (disposed || successHandledRef.current) return
      if (inFlight) {
        reconcilePending ||= reconcile
        return
      }
      inFlight = true
      try {
        const res = reconcile
          ? await paymentService.refreshPaymentStatus(appointmentId)
          : await paymentService.checkPaymentStatus(appointmentId)
        if (!disposed && session === sessionRef.current && res.isPaid && !successHandledRef.current) {
          successHandledRef.current = true
          setIsSuccess(true)
          if (pollingRef.current) clearInterval(pollingRef.current)
          successCallbackRef.current()
        }
      } catch {
        // Keep waiting for the backend worker or retry on the next interval.
      } finally {
        inFlight = false
        if (reconcilePending && !disposed && !successHandledRef.current) {
          reconcilePending = false
          void checkStatus(true)
        }
      }
    }

    void checkStatus(true)
    pollingRef.current = setInterval(() => {
      if (AppState.currentState === 'background' || AppState.currentState === 'inactive') return
      // A missing/delayed webhook must not leave an active payment screen waiting forever.
      void checkStatus(++checks % 4 === 0)
    }, 2500)
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void checkStatus(true)
    })
    return () => {
      disposed = true
      if (sessionRef.current === session) sessionRef.current++
      if (pollingRef.current) clearInterval(pollingRef.current)
      subscription.remove()
    }
  }, [visible, appointmentId, paymentData?.orderCode])

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Copy helper
  const handleCopy = async (text: string, fieldName: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text)
      } catch { }
    }
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Xử lý mở App Ngân hàng
  const handleSelectBank = async (bank: BankAppItem) => {
    if (!paymentData || openingBankRef.current || countdown <= 0) return
    openingBankRef.current = true
    try {
      const opened = await openBankApp(bank, paymentData)
      if (!opened) {
        Alert.alert('Không thể mở ứng dụng', 'Vui lòng quét mã QR hoặc mở trang thanh toán PayOS.')
      }
    } catch {
      Alert.alert('Không thể mở ứng dụng', 'Vui lòng quét mã QR hoặc mở trang thanh toán PayOS.')
    } finally {
      openingBankRef.current = false
    }
  }

  // Explicit demo action: no real bank transfer is required.
  const handleSimulateDemoPay = async () => {
    if (isChecking || !appointmentId || successHandledRef.current) return
    const session = sessionRef.current
    setIsChecking(true)
    try {
      await paymentService.simulateSuccess(paymentData?.paymentId || appointmentId)
      if (session !== sessionRef.current || successHandledRef.current) return
      const result = await paymentService.checkPaymentStatus(appointmentId)
      if (!result.isPaid) throw new Error('Payment not confirmed')
      if (session !== sessionRef.current || successHandledRef.current) return
      successHandledRef.current = true
      setIsSuccess(true)
      if (pollingRef.current) clearInterval(pollingRef.current)
      successCallbackRef.current()
    } catch {
      Alert.alert('Lỗi mô phỏng', 'Không thể mô phỏng thanh toán, vui lòng thử lại.')
    } finally {
      if (session === sessionRef.current) setIsChecking(false)
    }
  }

  // Mở checkoutUrl trình duyệt
  const handleOpenCheckoutUrl = async () => {
    if (paymentData?.checkoutUrl && countdown > 0) {
      try {
        await Linking.openURL(paymentData.checkoutUrl)
      } catch {
        Alert.alert('Lỗi', 'Không thể mở liên kết thanh toán.')
      }
    }
  }

  if (!paymentData && visible) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 bg-slate-900/60 items-center justify-center p-4">
          <View className="bg-white rounded-xl p-6 items-center w-full max-w-sm">
            <ActivityIndicator size="large" color="#28a745" />
            <Text className="text-sm font-bold text-slate-700 mt-3">
              Đang khởi tạo mã thanh toán VietQR...
            </Text>
          </View>
        </View>
      </Modal>
    )
  }

  const qrValue =
    paymentData?.qrCode ||
    (paymentData?.accountNumber
      ? `https://img.vietqr.io/image/${paymentData.bin || '970422'}-${paymentData.accountNumber}-compact2.png?amount=${paymentData.amount}&addInfo=${encodeURIComponent(paymentData.description || '')}&accountName=${encodeURIComponent(paymentData.accountName || '')}`
      : 'https://vitacare.vn')

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-950/70 justify-end">
        <View
          className="bg-white rounded-t-3xl flex-col overflow-hidden"
          style={{ height: modalHeight, paddingBottom: Math.max(insets.bottom, 12) }}
        >
          {/* Header */}
          <View className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between bg-slate-50/80" style={{ flexShrink: 0 }}>
            <View className="flex-row items-center flex-1">
              <Text className="text-base font-extrabold text-slate-900">
                Thanh toán VietQR
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              className="w-8 h-8 rounded-full bg-slate-200/70 items-center justify-center ml-2"
            >
              <Ionicons name="close" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Success Overlay nếu đã thanh toán */}
          {isSuccess ? (
            <View className="flex-1 p-8 items-center justify-center">
              <View className="w-16 h-16 rounded-full bg-primary-100 items-center justify-center mb-4">
                <Ionicons name="checkmark-circle" size={44} color="#28a745" />
              </View>
              <Text className="text-lg font-black text-slate-800">Thanh toán thành công!</Text>
              <Text className="text-xs text-slate-500 text-center mt-1">
                Lịch hẹn của bạn đã được xác nhận. Đang chuyển tới Phiếu khám...
              </Text>
              <ActivityIndicator size="small" color="#28a745" className="mt-4" />
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 }}
            >
              {/* KHỐI 1: APP-TO-APP DEEP LINKING (CHỌN MỞ NHANH APP NGÂN HÀNG) */}
              <View className="mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Mở nhanh ứng dụng Ngân hàng
                  </Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingVertical: 2 }}
                >
                  {POPULAR_BANKS.map((bank) => (
                      <TouchableOpacity
                        key={bank.id}
                        disabled={countdown <= 0}
                        activeOpacity={0.8}
                        onPress={() => handleSelectBank(bank)}
                        className="mr-2 items-center justify-center px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg min-w-[66px] shadow-2xs"
                      >
                        <Image
                          source={{ uri: bank.iconUrl }}
                          style={{ width: 46, height: 20 }}
                          className="mb-0.5"
                          resizeMode="contain"
                        />
                        <Text className="text-[10px] font-semibold text-slate-700 text-center">
                          {bank.shortName}
                        </Text>
                      </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* KHỐI 2: MÃ QR VIETQR PAYOS */}
              <View className="bg-primary-50/50 border border-primary-200/80 rounded-2xl p-4 mb-4 items-center shadow-xs">
                <View className="flex-row items-center justify-between w-full mb-2.5 px-1">
                  <VietQrLogo width={85} height={26} />
                  <View className="bg-primary-100/90 px-2.5 py-0.5 rounded-full border border-primary-200">
                    <Text className="text-[10px] font-bold text-primary-800">Napas 247</Text>
                  </View>
                </View>

                <View className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <QRCode
                    value={qrValue}
                    size={175}
                    color="#09090b"
                    backgroundColor="#ffffff"
                  />
                </View>

                <View className="flex-row items-center mt-2.5">
                  <Ionicons name="time-outline" size={13} color="#ea580c" />
                  <Text className="text-xs text-orange-600 font-semibold ml-1">
                    {countdown > 0 ? `Giữ chỗ trong: ${formatCountdown(countdown)}` : 'Hết thời gian giữ chỗ. Hệ thống đang đối soát kết quả thanh toán.'}
                  </Text>
                </View>
              </View>

              {/* KHỐI 3: CHI TIẾT THÔNG TIN CHUYỂN KHOẢN THỦ CÔNG */}
              <View className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-4 space-y-2.5">
                <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Thông tin chuyển khoản thủ công
                </Text>

                {/* Ngân hàng */}
                <View className="flex-row justify-between items-center py-0.5">
                  <Text className="text-xs text-slate-500">Ngân hàng thụ hưởng</Text>
                  <Text className="text-xs font-semibold text-slate-800">
                    {paymentData?.bin === '970422' || !paymentData?.bin
                      ? 'MB Bank (Quân Đội)'
                      : `Napas (${paymentData.bin})`}
                  </Text>
                </View>

                {/* Tên chủ TK */}
                <View className="flex-row justify-between items-center py-0.5">
                  <Text className="text-xs text-slate-500">Chủ tài khoản</Text>
                  <Text className="text-xs font-semibold text-slate-800 uppercase">
                    {paymentData?.accountName || 'PHONG KHAM VITACARE'}
                  </Text>
                </View>

                {/* Số tài khoản */}
                <View className="flex-row justify-between items-center py-0.5">
                  <View>
                    <Text className="text-xs text-slate-500">Số tài khoản</Text>
                    <Text className="text-xs font-semibold text-slate-800 tracking-wide mt-0.5">
                      {paymentData?.accountNumber || '---'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      paymentData?.accountNumber && handleCopy(paymentData.accountNumber, 'account')
                    }
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 items-center justify-center shadow-2xs"
                  >
                    <Ionicons
                      name={copiedField === 'account' ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copiedField === 'account' ? '#28a745' : '#475569'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Số tiền */}
                <View className="flex-row justify-between items-center py-0.5">
                  <View>
                    <Text className="text-xs text-slate-500">Số tiền</Text>
                    <Text className="text-xs font-semibold text-slate-800 mt-0.5">
                      {formatCurrencyVi(paymentData?.amount || 0)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      paymentData?.amount && handleCopy(String(paymentData.amount), 'amount')
                    }
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 items-center justify-center shadow-2xs"
                  >
                    <Ionicons
                      name={copiedField === 'amount' ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copiedField === 'amount' ? '#28a745' : '#475569'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Nội dung chuyển khoản */}
                <View className="flex-row justify-between items-center py-0.5">
                  <View className="flex-1 mr-2">
                    <Text className="text-xs text-slate-500">
                      Nội dung chuyển khoản (Bắt buộc)
                    </Text>
                    <Text className="text-xs font-semibold text-slate-800 tracking-wide mt-0.5">
                      {paymentData?.description || '---'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      paymentData?.description && handleCopy(paymentData.description, 'desc')
                    }
                    className="w-8 h-8 rounded-lg bg-white border border-slate-200 items-center justify-center shadow-2xs"
                  >
                    <Ionicons
                      name={copiedField === 'desc' ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={copiedField === 'desc' ? '#28a745' : '#475569'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Explicit test action, separate from automatic real payment reconciliation. */}
              <View className="space-y-2">
                <TouchableOpacity
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Test thanh toán mô phỏng"
                  onPress={handleSimulateDemoPay}
                  disabled={isChecking}
                  className="bg-primary-600 py-3 rounded-xl items-center justify-center flex-row shadow-sm"
                >
                  {isChecking ? (
                    <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
                  ) : (
                    <Ionicons name="flash-outline" size={16} color="#ffffff" className="mr-1.5" />
                  )}
                  <Text className="text-white  text-sm">
                    {isChecking ? 'Đang mô phỏng...' : 'Test thanh toán (mô phỏng)'}
                  </Text>
                </TouchableOpacity>


                {Boolean(paymentData?.checkoutUrl) && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleOpenCheckoutUrl}
                    disabled={countdown <= 0}
                    className="bg-white border border-slate-300 py-2.5 rounded-xl items-center justify-center flex-row"
                  >
                    <Ionicons name="open-outline" size={15} color="#475569" className="mr-1.5" />
                    <Text className="text-slate-700 font-bold text-xs">
                      Mở cổng thanh toán PayOS trên trình duyệt
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  )
}
