import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native'

import { useSpecialtyBooking } from '../../../src/hooks/flows/useSpecialtyBooking'
import { ScreenShell } from '../../../src/components/common/ScreenShell'
import { SelectInput } from '../../../src/components/common/SelectInput'
import { Button } from '../../../src/components/common/Button'
import {
  BookingDateTimeSection,
  BookingTimeline,
} from '../../../src/components/booking'
import { SelectModal } from '../../../src/components/common/SelectModal'
import { formatCurrencyVi } from '../../../src/utils/date'

export default function SpecialtyBookingScreen() {
  const {
    tomorrow,
    selectedSpecialtyId,
    selectedSpecialtyObj,
    selectedBranchId,
    selectedBranchObj,
    selectedService,
    selectedDoctor,
    selectedDate,
    selectedSlot,
    isStage1Complete,
    isFormComplete,

    // Loading
    loadingSpecialties,
    loadingBranches,
    loadingServices,
    loadingSlots,

    // Modal
    modalType,
    setModalType,

    // Options
    specialtyOptions,
    branchOptions,
    serviceOptions,
    doctorOptions,
    dateOptions,
    slotOptions,

    // Actions
    handleSelectSpecialty,
    handleSelectBranch,
    handleSelectService,
    handleSelectDate,
    handleSelectSlot,
    handleSelectDoctor,
    handleClearSpecialty,
    handleClearBranch,
    handleClearService,
    handleClearDoctor,
    handleClearSlot,
    handleContinue,
  } = useSpecialtyBooking()

  const doctorName = selectedDoctor
    ? `${selectedDoctor.title ? `${selectedDoctor.title} ` : 'BS. '}${
        selectedDoctor.fullName || selectedDoctor.name || 'Bác sĩ'
      }`
    : undefined

  const doctorSublabel = selectedDoctor
    ? `${(selectedDoctor as any).roomName ? `Phòng: ${(selectedDoctor as any).roomName} • ` : ''}${
        selectedDoctor.specialty_name || selectedSpecialtyObj?.name || 'Chuyên khoa'
      }${selectedDoctor.experience_years ? ` • ${selectedDoctor.experience_years} năm KN` : ''}`
    : undefined

  return (
    <ScreenShell showBackButton title="Đặt lịch khám chuyên khoa">
      <BookingTimeline currentStep={1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 }}
        >
          {/* 1. Chuyên khoa & Dịch vụ khám (Thứ tự: Chuyên khoa -> Chi nhánh -> Dịch vụ khám) */}
          <View className="mb-7">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5">
              1. Chuyên khoa & Dịch vụ khám
            </Text>

            {/* 1.1 Chọn Chuyên khoa */}
            <SelectInput
              label="Chuyên khoa khám"
              required
              placeholder="Chọn chuyên khoa khám..."
              value={selectedSpecialtyObj ? selectedSpecialtyObj.name : undefined}
              sublabel={
                selectedSpecialtyObj
                  ? selectedSpecialtyObj.description || 'Chuyên khoa khám chất lượng cao'
                  : 'Bắt buộc chọn 1 chuyên khoa cụ thể'
              }
              leftIcon="medkit-outline"
              loading={loadingSpecialties}
              onPress={() => setModalType('specialty')}
              onClear={selectedSpecialtyObj ? handleClearSpecialty : undefined}
            />

            {/* 1.2 Chọn Chi nhánh tiếp đón */}
            <SelectInput
              label="Chi nhánh tiếp đón"
              required
              disabled={!selectedSpecialtyId}
              placeholder={!selectedSpecialtyId ? 'Vui lòng chọn chuyên khoa trước...' : 'Chọn chi nhánh phòng khám...'}
              value={selectedBranchObj?.name}
              sublabel={selectedBranchObj?.address}
              leftIcon="business-outline"
              loading={loadingBranches}
              onPress={() => setModalType('branch')}
              onClear={selectedBranchId ? handleClearBranch : undefined}
            />

            {/* 1.3 Chọn Gói dịch vụ khám */}
            <SelectInput
              label="Dịch vụ khám chuyên khoa"
              required
              disabled={!selectedSpecialtyId || !selectedBranchId}
              placeholder={
                !selectedSpecialtyId
                  ? 'Vui lòng chọn chuyên khoa trước...'
                  : !selectedBranchId
                    ? 'Vui lòng chọn chi nhánh trước...'
                    : 'Chọn gói dịch vụ khám...'
              }
              value={selectedService ? selectedService.name : undefined}
              sublabel={
                selectedService
                  ? `${selectedService.description || 'Khám & tư vấn chuyên khoa'} • Phí: ${formatCurrencyVi(
                      Number(selectedService.price || 300000)
                    )}`
                  : undefined
              }
              leftIcon="clipboard-outline"
              loading={loadingServices}
              onPress={() => setModalType('service')}
              onClear={selectedService ? handleClearService : undefined}
            />
          </View>

          {/* 2. Thời gian khám (Chỉ mở khi đã hoàn tất Chuyên khoa -> Chi nhánh -> Dịch vụ) */}
          <BookingDateTimeSection
            isSpecialty
            hasSpecialty={isStage1Complete}
            hasDate={Boolean(selectedDate)}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            tomorrow={tomorrow}
            loadingSlots={loadingSlots}
            onOpenDateModal={() => setModalType('date')}
            onOpenSlotModal={() => setModalType('slot')}
            onClearSlot={handleClearSlot}
          />

          {/* 3. Bác sĩ phụ trách thăm khám (Input Select đồng bộ với các input phía trên) */}
          <View className="mb-8">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5">
              3. Bác sĩ phụ trách thăm khám
            </Text>

            <SelectInput
              label="Bác sĩ phụ trách thăm khám"
              required
              disabled={!selectedDate || !selectedSlot}
              placeholder={
                !selectedDate || !selectedSlot
                  ? 'Vui lòng chọn ngày và giờ khám trước...'
                  : 'Chọn bác sĩ phụ trách...'
              }
              value={doctorName}
              sublabel={doctorSublabel}
              leftIcon="person-outline"
              onPress={() => setModalType('doctor')}
              onClear={selectedDoctor ? handleClearDoctor : undefined}
            />
          </View>
        </ScrollView>

        {/* Nút Tiếp tục */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3 shadow-md">
          <Button
            title="Tiếp tục"
            onPress={handleContinue}
            disabled={!isFormComplete}
            className="py-3.5 rounded-xl w-full"
          />
        </View>

        {/* Modals */}
        <SelectModal
          visible={modalType === 'specialty'}
          onClose={() => setModalType(null)}
          title="Chọn chuyên khoa khám"
          subtitle="Bắt buộc chọn 1 chuyên khoa cụ thể để tiếp tục"
          searchPlaceholder="Tìm kiếm tên chuyên khoa..."
          options={specialtyOptions}
          selectedId={selectedSpecialtyId ? String(selectedSpecialtyId) : undefined}
          onSelect={handleSelectSpecialty}
        />

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
          visible={modalType === 'service'}
          onClose={() => setModalType(null)}
          title="Chọn dịch vụ khám chuyên khoa"
          subtitle={
            selectedSpecialtyObj?.name
              ? `Các gói dịch vụ thuộc chuyên khoa ${selectedSpecialtyObj.name}`
              : 'Chọn gói dịch vụ phù hợp'
          }
          searchPlaceholder="Tìm kiếm tên dịch vụ khám..."
          options={serviceOptions}
          selectedId={selectedService ? String(selectedService.id) : undefined}
          onSelect={handleSelectService}
        />

        <SelectModal
          visible={modalType === 'date'}
          onClose={() => setModalType(null)}
          title="Chọn ngày khám bệnh"
          subtitle="Các ngày có ca trực chuyên khoa khả dụng"
          options={dateOptions}
          selectedId={selectedDate}
          onSelect={handleSelectDate}
        />

        <SelectModal
          visible={modalType === 'slot'}
          onClose={() => setModalType(null)}
          title="Chọn khung giờ tiếp đón"
          subtitle={`Lịch khám ngày ${selectedDate}`}
          options={slotOptions}
          selectedId={selectedSlot}
          onSelect={handleSelectSlot}
        />

        <SelectModal
          visible={modalType === 'doctor'}
          onClose={() => setModalType(null)}
          title="Chọn bác sĩ phụ trách thăm khám"
          subtitle={
            selectedSlot
              ? `Danh sách bác sĩ trực ca lúc ${selectedSlot}`
              : 'Chọn bác sĩ chuyên khoa'
          }
          searchPlaceholder="Tìm kiếm tên bác sĩ..."
          options={doctorOptions}
          selectedId={selectedDoctor ? String(selectedDoctor.id) : undefined}
          onSelect={(opt) => {
            if (opt.extra) {
              handleSelectDoctor(opt.extra)
            }
          }}
        />
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
