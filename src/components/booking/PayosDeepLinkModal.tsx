import React, { useState, useEffect, useRef } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
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
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [openingBankId, setOpeningBankId] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(15 * 60) // 15 phút

  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Đếm ngược thời gian giữ chỗ thanh toán 15:00
  useEffect(() => {
    if (!visible) {
      setCountdown(15 * 60)
      return
    }

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current as any)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [visible])

  // 2. Tự động kiểm tra trạng thái thanh toán định kỳ mỗi 2.5s
  useEffect(() => {
    if (!visible || !appointmentId || isSuccess) {
      if (pollingRef.current) clearInterval(pollingRef.current)
      return
    }

    const checkStatus = async () => {
      try {
        const res = await paymentService.checkPaymentStatus(appointmentId)
        if (res.isPaid) {
          setIsSuccess(true)
          if (pollingRef.current) clearInterval(pollingRef.current)
          setTimeout(() => {
            onPaymentSuccess()
          }, 1200)
        }
      } catch {
        // Tiếp tục kiểm tra ở chu kỳ sau
      }
    }

    pollingRef.current = setInterval(checkStatus, 2500)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [visible, appointmentId, isSuccess, onPaymentSuccess])

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
    if (!paymentData) return
    setOpeningBankId(bank.id)
    try {
      await openBankApp(bank, paymentData)
    } catch {
      Alert.alert('Không thể mở ứng dụng', 'Vui lòng quét mã QR hoặc mở trang thanh toán PayOS.')
    } finally {
      setTimeout(() => setOpeningBankId(null), 1000)
    }
  }

  // Xử lý xác nhận thanh toán Demo (mô phỏng để test nhanh không cần chuyển khoản thật)
  const handleSimulateDemoPay = async () => {
    if (isChecking || !appointmentId) return
    setIsChecking(true)
    try {
      const targetId = paymentData?.paymentId || appointmentId
      await paymentService.simulateSuccess(targetId)
      setIsSuccess(true)
      setTimeout(() => {
        onPaymentSuccess()
      }, 1000)
    } catch {
      Alert.alert('Lỗi mô phỏng', 'Không thể mô phỏng thanh toán, vui lòng thử lại.')
    } finally {
      setIsChecking(false)
    }
  }

  // Mở checkoutUrl trình duyệt
  const handleOpenCheckoutUrl = async () => {
    if (paymentData?.checkoutUrl) {
      try {
        await Linking.openURL(paymentData.checkoutUrl)
      } catch {
        Alert.alert('Lỗi', 'Không thể mở liên kết thanh toán.')
      }
    }
  }

  if (!paymentData && visible) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 bg-slate-900/60 items-center justify-center p-4">
          <View className="bg-white rounded-xl p-6 items-center w-full max-w-sm">
            <ActivityIndicator size="large" color="#059669" />
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
        <View className="bg-white rounded-t-3xl max-h-[92%] flex-col overflow-hidden">
          {/* Header */}
          <View className="px-5 py-4 border-b border-slate-100 flex-row items-center justify-between bg-slate-50/80">
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
            <View className="p-8 items-center justify-center py-16">
              <View className="w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4">
                <Ionicons name="checkmark-circle" size={44} color="#059669" />
              </View>
              <Text className="text-lg font-black text-slate-800">Thanh toán thành công!</Text>
              <Text className="text-xs text-slate-500 text-center mt-1">
                Lịch hẹn của bạn đã được xác nhận. Đang chuyển tới Phiếu khám...
              </Text>
              <ActivityIndicator size="small" color="#059669" className="mt-4" />
            </View>
          ) : (
            <ScrollView
              className="flex-1 px-5 py-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
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
                  {POPULAR_BANKS.map((bank) => {
                    const isOpening = openingBankId === bank.id
                    return (
                      <TouchableOpacity
                        key={bank.id}
                        activeOpacity={0.8}
                        onPress={() => handleSelectBank(bank)}
                        className="mr-2 items-center justify-center px-2.5 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg min-w-[66px] shadow-2xs"
                      >
                        {isOpening ? (
                          <ActivityIndicator size="small" color="#059669" className="h-6" />
                        ) : (
                          <Image
                            source={{ uri: bank.iconUrl }}
                            style={{ width: 46, height: 20 }}
                            className="mb-0.5"
                            resizeMode="contain"
                          />
                        )}
                        <Text className="text-[10px] font-semibold text-slate-700 text-center">
                          {bank.shortName}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </ScrollView>
              </View>

              {/* KHỐI 2: MÃ QR VIETQR PAYOS */}
              <View className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 mb-4 items-center shadow-xs">
                <View className="flex-row items-center justify-between w-full mb-2.5 px-1">
                  <VietQrLogo width={85} height={26} />
                  <View className="bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <Text className="text-[10px] font-bold text-emerald-800">Napas 247</Text>
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
                    Giữ chỗ trong: {formatCountdown(countdown)}
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
                      color={copiedField === 'account' ? '#059669' : '#475569'}
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
                      color={copiedField === 'amount' ? '#059669' : '#475569'}
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
                      color={copiedField === 'desc' ? '#059669' : '#475569'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* NÚT THAO TÁC / MÔ PHỎNG TEST DEMO */}
              <View className="space-y-2">
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSimulateDemoPay}
                  disabled={isChecking}
                  className="bg-emerald-700 py-3 rounded-xl items-center justify-center flex-row shadow-sm"
                >
                  {isChecking ? (
                    <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
                  ) : (
                    <Ionicons name="flash-outline" size={16} color="#ffffff" className="mr-1.5" />
                  )}
                  <Text className="text-white  text-sm">
                    {isChecking ? 'Đang xác nhận...' : 'test'}
                  </Text>
                </TouchableOpacity>

                {Boolean(paymentData?.checkoutUrl) && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleOpenCheckoutUrl}
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
