import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Image } from 'expo-image'
import { useBookingStore } from '../../src/store/useBookingStore'
import { useDoctorAvailability } from '../../src/hooks/useBooking'
import { getTodayDateString, formatDateVi } from '../../src/utils/date'
import { MedicalCalendar } from '../../src/components/booking/MedicalCalendar'
import { TimeSlotPicker } from '../../src/components/booking/TimeSlotPicker'
import { Button } from '../../src/components/common/Button'
import { ScreenShell } from '../../src/components/common/ScreenShell'

export default function SelectDateTimeScreen() {
  const router = useRouter()
  const { draft, setDateTime } = useBookingStore()
  const doctor = draft.doctor

  const [date, setDate] = useState(draft.date || getTodayDateString())
  const [slot, setSlot] = useState(draft.slot || '')

  const { data: availableSlots = [], isLoading: loadingSlots } =
    useDoctorAvailability(doctor?.id, date)

  const handleNext = () => {
    if (!slot) {
      Alert.alert('Chưa chọn giờ khám', 'Vui lòng chọn một ca khám phù hợp để tiếp tục.')
      return
    }
    setDateTime(date, slot)
    router.push('/booking/patient-info')
  }

  const doctorName =
    doctor?.full_name || doctor?.fullName || doctor?.name || 'Bác sĩ chuyên khoa'
  const specialty =
    typeof doctor?.specialty === 'object'
      ? doctor?.specialty?.name
      : doctor?.specialty || doctor?.specialty_name || 'Đa khoa'

  return (
    <ScreenShell showBackButton title="Bước 2: Chọn ngày & ca khám">
      <ScrollView className="flex-1 px-5 pt-3" showsVerticalScrollIndicator={false}>
        {/* Doctor Info Card */}
        {doctor && (
          <View className="bg-white p-3.5 rounded-2xl border border-slate-100 mb-4 flex-row items-center shadow-xs">
            <Image
              source={{ uri: doctor.avatar }}
              className="w-12 h-12 rounded-xl bg-slate-100 mr-3"
              style={{ width: 48, height: 48, borderRadius: 12 }}
              contentFit="cover"
            />
            <View className="flex-1">
              <Text numberOfLines={1} className="text-sm font-bold text-slate-800">
                {doctorName}
              </Text>
              <Text className="text-xs text-sky-600 font-medium">{specialty}</Text>
            </View>
          </View>
        )}

        {/* 1. Lịch chọn ngày */}
        <Text className="text-sm font-bold text-slate-800 mb-2">
          Chọn ngày khám (Lịch tháng)
        </Text>
        <MedicalCalendar
          selectedDate={date}
          onSelectDate={(newDate) => {
            setDate(newDate)
            setSlot('') // Reset slot khi đổi ngày
          }}
        />

        {/* 2. Lưới ca khám (Chips) */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-sm font-bold text-slate-800">
            Giờ khám ngày {formatDateVi(date)}
          </Text>
          {loadingSlots && (
            <View className="flex-row items-center">
              <ActivityIndicator size="small" color="#0284c7" />
              <Text className="text-[11px] text-slate-400 ml-1">Đang tải ca...</Text>
            </View>
          )}
        </View>

        <TimeSlotPicker
          availableSlots={availableSlots}
          selectedSlot={slot}
          onSelectSlot={setSlot}
          isLoading={loadingSlots}
        />

        {/* Nút Tiếp Tục */}
        <Button
          title={slot ? `Tiếp tục (${slot} - ${formatDateVi(date)})` : 'Vui lòng chọn ca khám'}
          disabled={!slot}
          size="lg"
          onPress={handleNext}
          className="mb-8 mt-2"
        />
      </ScrollView>
    </ScreenShell>
  )
}
