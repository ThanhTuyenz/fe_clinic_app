import React from 'react'
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
import { Button } from '../../src/components/common/Button'

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

  return (
    <ScreenShell title="Phiếu khám bệnh">
      <ScrollView className="flex-1 px-5 py-4" showsVerticalScrollIndicator={false}>
        {/* Banner Chúc Mừng */}
        <View className="items-center mb-6">
          <View className="w-16 h-16 rounded-lg bg-emerald-50 items-center justify-center mb-3">
            <Ionicons name="checkmark-circle" size={40} color="#059669" />
          </View>
          <Text className="text-xl font-black text-slate-800 text-center">
            Đặt lịch khám thành công!
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            Vui lòng lưu lại mã QR phiếu khám này để check-in tại quầy tiếp đón.
          </Text>
        </View>

        {/* Thẻ Vé Khám Y Tế & Mã QR */}
        <View className="bg-white rounded-lg p-6 border border-slate-100 shadow-md mb-6 items-center">
          <Text className="text-xs font-semibold text-slate-400 mb-1">
            MÃ PHIẾU KHÁM
          </Text>
          <Text className="text-xl font-black text-emerald-600 tracking-wider mb-2">
            {appointmentCode}
          </Text>
          {Boolean(queueNum) && (
            <View className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-md mb-4">
              <Text className="text-xs font-bold text-emerald-800">
                Số thứ tự dự kiến: #{queueNum}
              </Text>
            </View>
          )}

          {/* QR Code */}
          <View className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs mb-5">
            <QRCode
              value={qrString}
              size={160}
              color="#0f172a"
              backgroundColor="#ffffff"
            />
          </View>
          <Text className="text-[11px] text-slate-400 text-center mb-6">
            Đưa mã QR cho nhân viên y tế tại sảnh phòng khám để quét mã
          </Text>

          {/* Thông tin chi tiết */}
          <View className="w-full pt-4 border-t border-dashed border-slate-200">
            {isLoading ? (
              <ActivityIndicator size="small" color="#0284c7" className="py-4" />
            ) : (
              <>
                <View className="flex-row justify-between py-2">
                  <Text className="text-xs text-slate-400">Dịch vụ / Bác sĩ</Text>
                  <Text className="text-xs font-bold text-slate-800 text-right max-w-[200px]">{serviceTitle}</Text>
                </View>
                <View className="flex-row justify-between py-2">
                  <Text className="text-xs text-slate-400">Thời gian</Text>
                  <Text className="text-xs font-bold text-slate-800">
                    {slotTime} - {dateFormatted}
                  </Text>
                </View>
                {roomName && (
                  <View className="flex-row justify-between py-2">
                    <Text className="text-xs text-slate-400">Phòng khám</Text>
                    <Text className="text-xs font-bold text-slate-800">{roomName}</Text>
                  </View>
                )}
                <View className="flex-row justify-between py-2">
                  <Text className="text-xs text-slate-400">Trạng thái</Text>
                  <Text className="text-xs font-bold text-emerald-600">
                    {appointment?.status === 'HOLD' ? 'Đã giữ chỗ' : 'Sẵn sàng tiếp đón'}
                  </Text>
                </View>
                <View className="flex-row justify-between py-2">
                  <Text className="text-xs text-slate-400">Cơ sở khám</Text>
                  <Text className="text-xs font-medium text-slate-700 text-right max-w-[200px]">
                    {branchName}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Nút hành động */}
        <Button
          title="Xem danh sách lịch hẹn"
          onPress={() => router.replace('/(tabs)/appointments')}
          className="mb-3"
        />
        <Button
          title="Về màn hình chính"
          variant="outline"
          onPress={() => router.replace('/(tabs)')}
          className="mb-8"
        />
      </ScrollView>
    </ScreenShell>
  )
}
