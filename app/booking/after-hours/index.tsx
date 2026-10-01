import React from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'

import { useAfterHoursBooking } from '../../../src/hooks/flows/useAfterHoursBooking'
import { ScreenShell } from '../../../src/components/common/ScreenShell'
import { SelectInput } from '../../../src/components/common/SelectInput'
import { Button } from '../../../src/components/common/Button'
import {
  BookingDateTimeSection,
  BookingMethodBanner,
  BookingTimeline,
  SpecialtyDoctorSection,
} from '../../../src/components/booking'
import { SelectModal } from '../../../src/components/common/SelectModal'
import { formatDateVi } from '../../../src/utils/date'

export default function AfterHoursBookingScreen() {
  const {
    tomorrow,
    selectedBranchId,
    selectedBranchObj,
    selectedSpecialtyId,
    selectedSpecialtyObj,
    selectedDoctor,
    selectedDate,
    selectedSlot,
    selectedSlotId,
    isFormComplete,

    // Loading
    loadingBranches,
    loadingSpecialties,
    loadingDoctors,
    loadingSlots,

    // Modal
    modalType,
    setModalType,

    // Options
    branchOptions,
    specialtyOptions,
    doctorOptions,
    dateOptions,
    slotOptions,

    // Actions
    handleSelectBranch,
    handleSelectSpecialty,
    handleSelectDoctorOption,
    handleSelectDate,
    handleSelectSlot,
    handleClearSpecialty,
    handleClearDoctor,
    handleClearSlot,
    handleContinue,
  } = useAfterHoursBooking()

  return (
    <ScreenShell showBackButton title="Đặt lịch khám bệnh">
      <BookingTimeline currentStep={1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        >
          {/* 1. Cơ sở & Dịch vụ khám ngoài giờ */}
          <View className="mb-7">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5">
              1. Cơ sở & Dịch vụ khám ngoài giờ
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

            {/* Chọn Chuyên khoa & Bác sĩ */}
            <SpecialtyDoctorSection
              hasBranch={Boolean(selectedBranchId)}
              hasSpecialty={Boolean(selectedSpecialtyId)}
              selectedSpecialtyObj={selectedSpecialtyObj}
              selectedDoctor={selectedDoctor}
              loadingSpecialties={loadingSpecialties}
              loadingDoctors={loadingDoctors}
              onOpenSpecialtyModal={() => setModalType('specialty')}
              onOpenDoctorModal={() => setModalType('doctor')}
              onClearSpecialty={handleClearSpecialty}
              onClearDoctor={handleClearDoctor}
            />
          </View>

          {/* 2. Thời gian khám ngoài giờ (17:30 - 20:30) */}
          <BookingDateTimeSection
            isHealthPackage={false}
            hasDoctorOrPackage={Boolean(selectedDoctor)}
            hasDate={Boolean(selectedDate)}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            tomorrow={tomorrow}
            isAfterHours={true}
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
          visible={modalType === 'specialty'}
          onClose={() => setModalType(null)}
          title="Chọn chuyên khoa khám ngoài giờ"
          subtitle="Các chuyên khoa có bác sĩ trực ngoài giờ"
          searchPlaceholder="Tìm kiếm tên chuyên khoa..."
          options={specialtyOptions}
          selectedId={selectedSpecialtyId ? String(selectedSpecialtyId) : undefined}
          onSelect={handleSelectSpecialty}
        />

        <SelectModal
          visible={modalType === 'doctor'}
          onClose={() => setModalType(null)}
          title="Chọn bác sĩ khám ngoài giờ"
          subtitle={
            selectedSpecialtyObj?.name
              ? `Chuyên khoa: ${selectedSpecialtyObj.name}`
              : 'Bác sĩ trực ngoài giờ 17:30 - 20:30'
          }
          searchPlaceholder="Tìm kiếm theo tên bác sĩ, học vị..."
          options={doctorOptions}
          selectedId={selectedDoctor?.id}
          loading={loadingDoctors}
          emptyText="Không có bác sĩ khả dụng cho chuyên khoa này tại cơ sở đã chọn"
          onSelect={handleSelectDoctorOption}
        />

        <SelectModal
          visible={modalType === 'date'}
          onClose={() => setModalType(null)}
          title="Chọn ngày khám bệnh"
          subtitle="Các ngày làm việc khả dụng trong hệ thống"
          options={dateOptions}
          selectedId={selectedDate}
          onSelect={handleSelectDate}
        />

        <SelectModal
          visible={modalType === 'slot'}
          onClose={() => setModalType(null)}
          title="Chọn khung giờ ngoài giờ"
          subtitle={selectedDate ? `Ngày ${formatDateVi(selectedDate)} • Khung giờ tối 17:30 - 20:30` : 'Khung giờ khám'}
          options={slotOptions}
          selectedId={
            selectedSlotId ||
            (selectedSlot
              ? slotOptions.find((o) => o.title === selectedSlot || o.title.startsWith(selectedSlot.slice(0, 5)))?.id
              : undefined)
          }
          loading={loadingSlots}
          emptyText="Không còn ca khám ngoài giờ trống trong ngày này. Vui lòng chọn ngày khác."
          onSelect={handleSelectSlot}
        />
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
