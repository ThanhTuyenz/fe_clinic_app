import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import QRCode from 'react-native-qrcode-svg'
import Ionicons from '@expo/vector-icons/Ionicons'
import { appointmentService } from '../../src/services/appointmentService'
import { formatDateVi } from '../../src/utils/date'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { canJoinTelehealth } from '../../src/services/telehealthService'

export default function BookingConfirmationScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: appointment, isLoading } = useQuery({
    queryKey: ['appointment', id],
    queryFn: () => appointmentService.getAppointmentById(id!),
    enabled: Boolean(id && id !== 'new'),
  })

  const doctorName =
    appointment?.doctor?.full_name ||
    appointment?.doctor?.fullName ||
    appointment?.doctor?.name ||
    'Bác sĩ chuyên khoa'
  const serviceTitle =
    appointment?.healthPackage?.name ||
    appointment?.service?.name ||
    doctorName
  const dateFormatted = formatDateVi(appointment?.appointment_date || appointment?.appointmentDate || new Date().toISOString())
  const slotTime =
    appointment?.startTime && appointment?.endTime
      ? `${String(appointment.startTime).slice(0, 5)} - ${String(appointment.endTime).slice(0, 5)}`
      : appointment?.startTime || appointment?.slot || '08:00'
  const appointmentCode = appointment?.code || appointment?.bookingCode || `VC-${String(id).slice(-6).toUpperCase()}`
  const qrString = appointment?.qrPayload || appointmentCode
  const branchName = appointment?.branch?.name || appointment?.branch?.address || 'VitaCare Clinic, Tầng 2 Sảnh Khám Bệnh'
  const roomName = appointment?.room?.name ? `Phòng ${appointment.room.name}` : null
  const queueNum = appointment?.queueNumber
  const isOnline = Boolean(appointment?.isTelehealth || appointment?.bookingMethod?.code === 'ONLINE_CONSULTATION')
  const status = appointment?.status?.toUpperCase()
  const statusLabel = status === 'HOLD' ? 'Đã giữ chỗ'
    : status === 'CANCELLED' ? 'Đã hủy'
    : status === 'COMPLETED' ? 'Đã hoàn thành'
    : status === 'IN_EXAMINATION' ? (isOnline ? 'Đang tư vấn' : 'Đang khám')
    : isOnline ? 'Đã xác nhận tư vấn online' : 'Sẵn sàng tiếp đón'

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
              {isOnline ? 'Lịch tư vấn trực tuyến của bạn' : 'Đặt lịch khám thành công!'}
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-0.5">
              {isOnline
                ? 'Đến giờ hẹn, vào phòng tư vấn trực tuyến để gặp bác sĩ. Không cần check-in tại quầy.'
                : 'Vui lòng lưu lại mã QR phiếu khám này để check-in tại quầy tiếp đón.'}
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
            {!isOnline && Boolean(queueNum) && (
              <View className="bg-primary-50 border border-primary-200 px-3 py-1 rounded-md mb-4">
                <Text className="text-xs font-bold text-primary-800">
                  Số thứ tự dự kiến: #{queueNum}
                </Text>
              </View>
            )}

            {/* QR Code */}
            {!isOnline && !isLoading && <>
            <View className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs mb-3.5">
              <QRCode
                value={qrString}
                size={160}
                color="#0f172a"
                backgroundColor="#ffffff"
              />
            </View>
            <Text className="text-[11px] text-slate-400 text-center mb-4">
              Đưa mã QR cho nhân viên y tế tại sảnh phòng khám để quét mã
            </Text>
            </>}
            {isOnline && (
              <View className="w-full rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4">
                <Text className="text-xs text-blue-800 text-center">
                  Chuẩn bị camera, micro và kết nối Internet ổn định trước giờ hẹn.
                </Text>
                {appointment && canJoinTelehealth(appointment) && (
                  <TouchableOpacity
                    onPress={() => router.push(`/consultation/${id}`)}
                    accessibilityRole="button"
                    className="mt-3 flex-row items-center justify-center rounded-lg bg-primary-600 px-4 py-3"
                  >
                    <Ionicons name="videocam-outline" size={18} color="white" />
                    <Text className="ml-2 text-xs font-bold text-white">Vào phòng tư vấn</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

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
