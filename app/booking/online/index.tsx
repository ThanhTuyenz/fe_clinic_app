import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'

import { useOnlineBooking } from '../../../src/hooks/flows/useOnlineBooking'
import { ScreenShell } from '../../../src/components/common/ScreenShell'
import { SelectInput } from '../../../src/components/common/SelectInput'
import { Button } from '../../../src/components/common/Button'
import {
  BookingDateTimeSection,
  BookingTimeline,
} from '../../../src/components/booking'
import { SelectModal } from '../../../src/components/common/SelectModal'
import { formatDateVi } from '../../../src/utils/date'

export default function OnlineBookingScreen() {
  const {
    tomorrow,
    selectedBranchId,
    selectedBranchObj,
    selectedDoctor,
    selectedDate,
    selectedSlot,
    selectedSlotId,
    isFormComplete,

    doctors,

    // Loading
    loadingBranches,
    loadingDoctors,
    loadingSlots,

    // Modal
    modalType,
    setModalType,

    // Options
    doctorOptions,
    branchOptions,
    dateOptions,
    slotOptions,

    // Actions
    handleSelectDoctor,
    handleSelectBranch,
    handleSelectDate,
    handleSelectSlot,
    handleClearSlot,
    handleContinue,
  } = useOnlineBooking()

  return (
    <ScreenShell showBackButton title="Tư vấn sức khỏe trực tuyến">
      <BookingTimeline currentStep={1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        >
          {/* 1. Cơ sở & Bác sĩ tư vấn online */}
          <View className="mb-7">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5">
              1. Cơ sở & Bác sĩ tư vấn 1:1
            </Text>

            {/* Chi nhánh tiếp đón */}
            <SelectInput
              label="Chi nhánh tiếp đón"
              required
              placeholder="Chọn chi nhánh phòng khám..."
              value={selectedBranchObj?.name}
              sublabel={selectedBranchObj?.address}
              leftIcon="business-outline"
              loading={loadingBranches}
              onPress={() => setModalType('branch')}
            />

            <SelectInput
              label="Bác sĩ tư vấn online"
              required
              placeholder="Chọn bác sĩ tư vấn online..."
              value={selectedDoctor?.full_name || selectedDoctor?.fullName || selectedDoctor?.name}
              sublabel={doctorOptions.find(option => String(option.id) === String(selectedDoctor?.id))?.subtitle}
              leftIcon="person-outline"
              loading={loadingDoctors}
              disabled={!selectedBranchId}
              onPress={() => setModalType('doctor')}
            />
          </View>

          {/* 2. Thời gian tư vấn trực tuyến */}
          <BookingDateTimeSection
            isHealthPackage={false}
            isOnlineConsultation
            hasDoctorOrPackage={Boolean(selectedDoctor)}
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
        </ScrollView>

        {/* Nút Tiếp tục */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3">
          <Button
            title="Tiếp tục"
            onPress={handleContinue}
            disabled={!isFormComplete}
            className="py-3 rounded-lg w-full"
          />
        </View>

        {/* Modals */}
        <SelectModal
          visible={modalType === 'branch'}
          onClose={() => setModalType(null)}
          title="Chọn chi nhánh tiếp đón"
          subtitle="Hệ thống đa chi nhánh VitaCare Clinic"
          searchPlaceholder="Tìm kiếm chi nhánh, quận..."
          options={branchOptions}
          selectedId={selectedBranchId}
          onSelect={handleSelectBranch}
        />

        <SelectModal
          visible={modalType === 'doctor'}
          onClose={() => setModalType(null)}
          title="Chọn bác sĩ tư vấn online"
          subtitle={`${doctors.length} bác sĩ • Tư vấn trực tuyến 1:1`}
          searchPlaceholder="Tìm theo tên bác sĩ, chuyên khoa..."
          options={doctorOptions}
          selectedId={selectedDoctor?.id}
          loading={loadingDoctors}
          emptyText="Chưa có bác sĩ tư vấn online. Vui lòng thử lại sau."
          onSelect={option => { if (option.extra) handleSelectDoctor(option.extra) }}
        />

        <SelectModal
          visible={modalType === 'date'}
          onClose={() => setModalType(null)}
          title="Chọn ngày tư vấn"
          subtitle="Các ngày làm việc khả dụng trong hệ thống"
          options={dateOptions}
          selectedId={selectedDate}
          onSelect={handleSelectDate}
        />

        <SelectModal
          visible={modalType === 'slot'}
          onClose={() => setModalType(null)}
          title="Chọn khung giờ tư vấn trực tuyến"
          subtitle={selectedDate ? `Ngày ${formatDateVi(selectedDate)} • Gọi video 1:1 qua ứng dụng` : 'Khung giờ khám'}
          options={slotOptions}
          selectedId={
            selectedSlotId ||
            (selectedSlot
              ? slotOptions.find((o) => o.title === selectedSlot || o.title.startsWith(selectedSlot.slice(0, 5)))?.id
              : undefined)
          }
          loading={loadingSlots}
          emptyText="Không còn ca tư vấn trống trong ngày này. Vui lòng chọn ngày khác."
          onSelect={handleSelectSlot}
        />
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
