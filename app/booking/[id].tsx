import {
  Alert,
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appointmentStatusTitle, canCancelAppointment, canShowCheckInQr } from '../../src/utils/appointmentStatus'
import { useAuthStore } from '../../src/store/useAuthStore'
import QRCode from 'react-native-qrcode-svg'
import Ionicons from '@expo/vector-icons/Ionicons'
import { appointmentService } from '../../src/services/appointmentService'
import { formatDateVi } from '../../src/utils/date'
import { ScreenShell } from '../../src/components/common/ScreenShell'

export default function BookingConfirmationScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const client = useQueryClient()
  const userId = useAuthStore(state => state.user?.id)
  const { data: appointment, isLoading, refetch } = useQuery({
    queryKey: ['appointment', userId, id],
    queryFn: () => appointmentService.getAppointmentById(id!),
    enabled: Boolean(userId && id && id !== 'new'),
  })

  const cancel = useMutation({ mutationFn: () => appointmentService.cancelAppointment(id!, 'Bệnh nhân yêu cầu hủy lịch'), onSuccess: async () => {
    await Promise.all([client.invalidateQueries({ queryKey: ['myAppointments'] }), client.invalidateQueries({ queryKey: ['appointment'] }), client.invalidateQueries({ queryKey: ['family-order'] })])
  }, onError: (error: Error) => Alert.alert('Không thể hủy lịch', error.message) })
  if (isLoading) return <ScreenShell title="Thông tin lịch khám"><ActivityIndicator color="#28a745" /></ScreenShell>
  if (!appointment) return <ScreenShell showBackButton title="Thông tin lịch khám"><View className="p-5"><Text className="text-slate-600">Không tải được lịch khám. Vui lòng kiểm tra đăng nhập và thử lại.</Text><TouchableOpacity onPress={() => { void refetch() }}><Text className="mt-4 text-primary-700">Thử lại</Text></TouchableOpacity></View></ScreenShell>

  const doctorName =
    appointment?.doctor?.full_name ||
    appointment?.doctor?.fullName ||
    appointment?.doctor?.name ||
    'Bác sĩ chuyên khoa'
  const serviceTitle =
    appointment?.healthPackage?.name ||
    appointment?.service?.name ||
    doctorName
  const actualDate = appointment.appointment_date || appointment.appointmentDate
  const dateFormatted = actualDate ? formatDateVi(actualDate) : 'Chưa có ngày khám'
  const slotTime =
    appointment?.startTime && appointment?.endTime
      ? `${String(appointment.startTime).slice(0, 5)} - ${String(appointment.endTime).slice(0, 5)}`
      : appointment?.startTime || appointment?.slot || 'Chưa có giờ khám'
  const appointmentCode = appointment.code || appointment.bookingCode || 'Chưa phát hành mã vé'
  const qrString = appointment.qrPayload
  const branchName = appointment?.branch?.name || appointment?.branch?.address || 'Chưa cập nhật cơ sở'
  const roomName = appointment?.room?.name ? `Phòng ${appointment.room.name}` : null
  const queueNum = appointment?.queueNumber
  const isOnline = Boolean(appointment?.isTelehealth || appointment?.bookingMethod?.code === 'ONLINE_CONSULTATION')
  const status = appointment?.status?.toUpperCase()
  const statusLabel = appointmentStatusTitle(status)

  return (
    <ScreenShell title={isOnline ? 'Phiếu tư vấn trực tuyến' : 'Phiếu khám bệnh'}>
      <View className="flex-1 bg-slate-50">
        <ScrollView
          className="flex-1 px-5 pt-3.5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 85 }}
        >
          {/* Thông báo đặt lịch thành công gọn gàng */}
          <View className="mb-3 items-center">
            <Text className="text-base font-extrabold text-slate-900 text-center">
              {statusLabel}
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-0.5">
              {isOnline
                ? 'Lịch tư vấn của bạn đã được ghi nhận. Xem lại thông tin trong mục Lịch hẹn.'
                : canShowCheckInQr(appointment) ? 'Vui lòng lưu lại mã QR phiếu khám này để check-in tại quầy tiếp đón.' : 'Mã QR chỉ được hiển thị khi lịch hợp lệ và máy chủ đã phát hành vé.'}
            </Text>
          </View>

          {/* Thẻ Vé Khám Y Tế & Mã QR */}
          <View className="bg-white rounded-lg p-5 border border-slate-200/90 shadow-2xs mb-4 items-center">
            <Text className="text-xs font-semibold text-slate-400 mb-1">
              {isOnline ? 'MÃ LỊCH TƯ VẤN' : 'MÃ PHIẾU KHÁM'}
            </Text>
            <Text className="text-xl font-black text-primary-700 tracking-wider mb-2">
              {appointmentCode}
            </Text>
            {queueNum != null && (
              <View className="bg-primary-50 border border-primary-200 px-3 py-1 rounded-md mb-4">
                <Text className="text-xs font-bold text-primary-800">
                  Số thứ tự dự kiến: #{queueNum}
                </Text>
              </View>
            )}

            {/* QR Code */}
            {canShowCheckInQr(appointment) && qrString && <>
            <View className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs mb-3.5">
              <QRCode
                value={qrString}
                size={160}
                color="#0f172a"
                backgroundColor="#ffffff"
              />
            </View>
            <Text className="text-[11px] text-slate-400 text-center mb-4">
              {isOnline ? 'Mã QR xác nhận lịch tư vấn trực tuyến của bạn' : 'Đưa mã QR cho nhân viên y tế tại sảnh phòng khám để quét mã'}
            </Text>
            </>}

            {/* Thông tin chi tiết */}
            <View className="w-full pt-3.5 border-t border-dashed border-slate-200">
              {isLoading ? (
                <ActivityIndicator size="small" color="#28a745" className="py-4" />
              ) : (
                <>
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-xs text-slate-400">Dịch vụ / Bác sĩ</Text>
                    <Text className="text-xs font-bold text-slate-800 text-right max-w-[200px]">{serviceTitle}</Text>
                  </View>
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-xs text-slate-400">Thời gian</Text>
                    <Text className="text-xs font-bold text-slate-800">
                      {slotTime} - {dateFormatted}
                    </Text>
                  </View>
                  {!isOnline && roomName && (
                    <View className="flex-row justify-between py-1.5">
                      <Text className="text-xs text-slate-400">Phòng khám</Text>
                      <Text className="text-xs font-bold text-slate-800">{roomName}</Text>
                    </View>
                  )}
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-xs text-slate-400">Trạng thái</Text>
                    <Text className="text-xs font-bold text-primary-700">
                      {statusLabel}
                    </Text>
                  </View>
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-xs text-slate-400">{isOnline ? 'Đơn vị phụ trách' : 'Cơ sở khám'}</Text>
                    <Text className="text-xs font-medium text-slate-700 text-right max-w-[200px]">
                      {branchName}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>
          {canCancelAppointment(appointment.status) && <TouchableOpacity disabled={cancel.isPending} onPress={() => Alert.alert('Hủy lịch khám', 'Bạn muốn hủy lịch khám này? Phí hoàn trả (nếu có) áp dụng theo chính sách phòng khám.', [{ text: 'Đóng', style: 'cancel' }, { text: 'Hủy lịch', style: 'destructive', onPress: () => cancel.mutate() }])} className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-3"><Text className="text-center font-semibold text-rose-700">{cancel.isPending ? 'Đang hủy...' : 'Hủy lịch khám'}</Text></TouchableOpacity>}
        </ScrollView>

        {/* Cố định Bottom Bar với 2 nút có Icon trực quan */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-4 py-3 flex-row items-center gap-2.5">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.replace('/(tabs)')}
            className="flex-1 flex-row items-center justify-center py-3 px-3 bg-slate-100 border border-slate-200/80 rounded-lg active:bg-slate-200"
          >
            <Ionicons name="home-outline" size={17} color="#334155" style={{ marginRight: 6 }} />
            <Text className="text-xs font-bold text-slate-700">Trang chủ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.replace('/(tabs)/appointments')}
            className="flex-1 flex-row items-center justify-center py-3 px-3 bg-primary-600 rounded-lg active:bg-primary-800 shadow-2xs"
          >
            <Ionicons name="calendar-outline" size={17} color="#ffffff" style={{ marginRight: 6 }} />
            <Text className="text-xs font-bold text-white">Xem lịch hẹn</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenShell>
  )
}
