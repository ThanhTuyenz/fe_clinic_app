import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'

import { usePackageBooking } from '../../../src/hooks/flows/usePackageBooking'
import { ScreenShell } from '../../../src/components/common/ScreenShell'
import { SelectInput } from '../../../src/components/common/SelectInput'
import { Button } from '../../../src/components/common/Button'
import {
  BookingDateTimeSection,
  BookingTimeline,
} from '../../../src/components/booking'
import { SelectModal } from '../../../src/components/common/SelectModal'
import { formatCurrencyVi, formatDateVi } from '../../../src/utils/date'

export default function PackageBookingScreen() {
  const {
    tomorrow,
    selectedBranchId,
    selectedBranchObj,
    selectedPackage,
    selectedDate,
    selectedSlot,
    selectedSlotId,
    isFormComplete,

    // Loading
    loadingBranches,
    loadingPackages,
    loadingSlots,

    // Modal
    modalType,
    setModalType,

    // Options
    branchOptions,
    packageOptions,
    dateOptions,
    slotOptions,

    // Actions
    handleSelectBranch,
    handleSelectPackage,
    handleSelectDate,
    handleSelectSlot,
    handleClearPackage,
    handleClearSlot,
    handleContinue,
  } = usePackageBooking()

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
          {/* 1. Cơ sở & Gói khám */}
          <View className="mb-7">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5">
              1. Cơ sở & Gói khám sức khỏe
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

            {/* Gói khám sức khỏe */}
            <SelectInput
              label="Gói khám sức khỏe"
              required
              disabled={!selectedBranchId}
              placeholder={!selectedBranchId ? 'Vui lòng chọn chi nhánh trước' : 'Chọn gói khám định kỳ'}
              value={selectedPackage?.name}
              sublabel={
                selectedPackage
                  ? `Giá trọn gói: ${formatCurrencyVi(Number(selectedPackage.price || 1200000))}`
                  : undefined
              }
              leftIcon="shield-checkmark-outline"
              loading={loadingPackages}
              onPress={() => setModalType('package')}
              onClear={selectedPackage ? handleClearPackage : undefined}
            />
          </View>

          {/* 2. Thời gian khám */}
          <BookingDateTimeSection
            isHealthPackage={true}
            hasDoctorOrPackage={Boolean(selectedPackage)}
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
          visible={modalType === 'package'}
          onClose={() => setModalType(null)}
          title="Chọn gói khám sức khỏe"
          subtitle="Tầm soát và khám tổng quát định kỳ"
          searchPlaceholder="Tìm kiếm gói khám..."
          options={packageOptions}
          selectedId={selectedPackage?.id}
          loading={loadingPackages}
          onSelect={handleSelectPackage}
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
          title="Chọn khung giờ tiếp đón"
          subtitle={selectedDate ? `Ngày ${formatDateVi(selectedDate)} • Vui lòng đến trước 10 phút` : 'Khung giờ khám'}
          options={slotOptions}
          selectedId={
            selectedSlotId ||
            (selectedSlot
              ? slotOptions.find((o) => o.title === selectedSlot || o.title.startsWith(selectedSlot.slice(0, 5)))?.id
              : undefined)
          }
          loading={loadingSlots}
          emptyText="Không còn ca khám trống trong ngày này. Vui lòng chọn ngày khác."
          onSelect={handleSelectSlot}
        />
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
