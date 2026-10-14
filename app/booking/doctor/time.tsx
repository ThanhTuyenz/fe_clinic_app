import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import Ionicons from '@expo/vector-icons/Ionicons'

import { useDoctorTimeBooking } from '../../../src/hooks/flows/useDoctorTimeBooking'
import { ScreenShell } from '../../../src/components/common/ScreenShell'
import { Button } from '../../../src/components/common/Button'
import {
  BookingDateTimeSection,
  BookingTimeline,
} from '../../../src/components/booking'
import { SelectModal } from '../../../src/components/common/SelectModal'
import { formatCurrencyVi, formatDateVi } from '../../../src/utils/date'

export default function DoctorTimeBookingScreen() {
  const {
    doctor,
    tomorrow,
    selectedDate,
    selectedSlot,
    selectedSlotId,
    modalType,
    setModalType,
    loadingDates,
    loadingSlots,
    dateOptions,
    slotOptions,
    isFormComplete,
    handleSelectDate,
    handleSelectSlot,
    handleClearSlot,
    handleChangeDoctor,
    handleContinue,
  } = useDoctorTimeBooking()

  if (!doctor) {
    return (
      <ScreenShell showBackButton title="Thời gian khám">
        <View className="flex-1 items-center justify-center p-6 bg-white">
          <ActivityIndicator size="small" color="#28a745" />
          <Text className="text-xs text-slate-500 mt-2">Đang tải thông tin bác sĩ...</Text>
        </View>
      </ScreenShell>
    )
  }

  const doctorName =
    doctor.full_name || doctor.fullName || doctor.name || 'Bác sĩ chuyên khoa'
  const doctorTitle = doctor.title || 'BS.'
  const doctorSpecialty =
    typeof doctor.specialty === 'object'
      ? doctor.specialty?.name
      : doctor.specialty || doctor.specialty_name || 'Đa khoa'
  const consultationFee = doctor.consultation_fee || doctor.price || 300000

  return (
    <ScreenShell showBackButton title="Thời gian khám">
      <BookingTimeline currentStep={1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        >
          {/* Thông tin bác sĩ đã chọn */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Bác sĩ đã chọn
              </Text>
              <TouchableOpacity
                onPress={handleChangeDoctor}
                className="flex-row items-center active:opacity-70"
              >
                <Ionicons name="swap-horizontal" size={14} color="#28a745" />
                <Text className="text-xs font-semibold text-primary-700 ml-1">Đổi bác sĩ</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-primary-50/40 rounded-lg p-3 border border-primary-200 flex-row items-center">
              <Image
                source={{ uri: doctor.avatar }}
                style={{ width: 60, height: 60, borderRadius: 8 }}
                className="w-[60px] h-[60px] rounded-lg bg-primary-100 mr-3"
                contentFit="cover"
                transition={200}
              />
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-[11px] font-semibold text-primary-700 bg-primary-100/70 px-1.5 py-0.5 rounded mr-1.5 border border-primary-200">
                    {doctorTitle}
                  </Text>
                  <Text numberOfLines={1} className="text-sm font-bold text-slate-900 flex-1">
                    {doctorName}
                  </Text>
                </View>

                <Text numberOfLines={1} className="text-xs text-slate-500 mt-1">
                  Chuyên khoa: {doctorSpecialty}
                </Text>

                <View className="flex-row items-center justify-between mt-1.5">
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={13} color="#f59e0b" />
                    <Text className="text-xs font-semibold text-slate-700 ml-1">
                      {doctor.rating || 5.0}
                    </Text>
                    {Boolean(doctor.experience_years) && (
                      <Text className="text-xs text-slate-400 ml-1.5">
                        • {doctor.experience_years} năm KN
                      </Text>
                    )}
                  </View>
                  <Text className="text-xs font-bold text-primary-700">
                    {formatCurrencyVi(consultationFee)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 2. Chọn ngày & giờ khám */}
          <BookingDateTimeSection
            isHealthPackage={false}
            hasDoctorOrPackage={true}
            hasDate={Boolean(selectedDate)}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            tomorrow={tomorrow}
            isAfterHours={false}
            loadingSlots={loadingSlots}
            onOpenDateModal={() => setModalType('date')}
            onOpenSlotModal={() => setModalType('slot')}
            onClearSlot={handleClearSlot}
          />

          {/* Lời nhắc hữu ích */}
          <View className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <View className="flex-row items-center mb-1">
              <Ionicons name="information-circle-outline" size={16} color="#28a745" />
              <Text className="text-xs font-bold text-slate-700 ml-1.5">Lưu ý trước khi đến khám</Text>
            </View>
            <Text className="text-[11px] text-slate-500 leading-4">
              • Quý khách vui lòng có mặt tại phòng khám trước giờ hẹn 10 - 15 phút để làm thủ tục tiếp đón.
            </Text>
            <Text className="text-[11px] text-slate-500 leading-4 mt-0.5">
              • Chi phí khám sẽ được thanh toán hoặc xác nhận ở bước kế tiếp.
            </Text>
          </View>
        </ScrollView>

        {/* Nút Tiếp tục sang Thông tin người khám */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3">
          <Button
            title={isFormComplete ? 'Tiếp tục: Thông tin người khám' : 'Vui lòng chọn ngày & giờ khám'}
            onPress={handleContinue}
            disabled={!isFormComplete}
            className="py-3 rounded-lg w-full"
          />
        </View>

        {/* Modals: Ngày khám & Khung giờ tiếp đón */}
        <SelectModal
          visible={modalType === 'date'}
          onClose={() => setModalType(null)}
          title="Chọn ngày khám bệnh"
          subtitle={`Lịch làm việc của ${doctorTitle} ${doctorName}`}
          options={dateOptions}
          selectedId={selectedDate}
          onSelect={handleSelectDate}
        />

        <SelectModal
          visible={modalType === 'slot'}
          onClose={() => setModalType(null)}
          title="Chọn khung giờ tiếp đón"
          subtitle={
            selectedDate
              ? `Ngày ${formatDateVi(selectedDate)} • Vui lòng đến trước 10 phút`
              : 'Khung giờ khám'
          }
          options={slotOptions}
          selectedId={
            selectedSlotId ||
            (selectedSlot
              ? slotOptions.find((o) => o.title === selectedSlot || o.title.startsWith(selectedSlot.slice(0, 5)))?.id
              : undefined)
          }
          loading={loadingDates || loadingSlots}
          emptyText="Không còn ca khám trống trong ngày này. Vui lòng chọn ngày khác."
          onSelect={handleSelectSlot}
        />
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
