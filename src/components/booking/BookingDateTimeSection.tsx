import React from 'react'
import { Text, View } from 'react-native'
import { SelectInput } from '../common/SelectInput'
import { formatDateVi } from '../../utils/date'

interface BookingDateTimeSectionProps {
  isHealthPackage?: boolean
  isSpecialty?: boolean
  hasDoctorOrPackage?: boolean
  hasSpecialty?: boolean
  hasDate: boolean
  selectedDate: string
  selectedSlot: string
  tomorrow: string
  isAfterHours?: boolean
  loadingSlots?: boolean
  onOpenDateModal: () => void
  onOpenSlotModal: () => void
  onClearSlot?: () => void
}

export const BookingDateTimeSection: React.FC<BookingDateTimeSectionProps> = ({
  isHealthPackage = false,
  isSpecialty = false,
  hasDoctorOrPackage = false,
  hasSpecialty = false,
  hasDate,
  selectedDate,
  selectedSlot,
  tomorrow,
  isAfterHours = false,
  loadingSlots = false,
  onOpenDateModal,
  onOpenSlotModal,
  onClearSlot,
}) => {
  const isEnabled = hasDoctorOrPackage || (isSpecialty && hasSpecialty)

  const datePlaceholder = !isEnabled
    ? isSpecialty
      ? 'Vui lòng chọn chuyên khoa trước...'
      : isHealthPackage
        ? 'Vui lòng chọn gói khám trước...'
        : 'Vui lòng chọn bác sĩ trước...'
    : 'Chọn ngày khám...'

  const slotPlaceholder = !isEnabled
    ? isSpecialty
      ? 'Vui lòng chọn chuyên khoa trước...'
      : isHealthPackage
        ? 'Vui lòng chọn gói khám trước...'
        : 'Vui lòng chọn bác sĩ trước...'
    : !hasDate
      ? 'Vui lòng chọn ngày khám trước...'
      : 'Chọn ca/giờ khám...'

  return (
    <View className="mb-8">
      <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5">
        2. Thời gian khám
      </Text>

      {/* Select Ngày khám */}
      <SelectInput
        label="Ngày khám dự kiến"
        required
        disabled={!isEnabled}
        placeholder={datePlaceholder}
        value={isEnabled && selectedDate ? formatDateVi(selectedDate) : undefined}
        sublabel={isEnabled && selectedDate === tomorrow ? 'Ngày mai (Sớm nhất)' : undefined}
        leftIcon="calendar-outline"
        onPress={onOpenDateModal}
      />

      {/* Select Khung giờ khám */}
      <SelectInput
        label="Khung giờ tiếp đón"
        required
        disabled={!hasDate || !isEnabled}
        placeholder={slotPlaceholder}
        value={
          hasDate && isEnabled && selectedSlot
            ? `${selectedSlot} (${isAfterHours ? 'Ngoài giờ' : 'Ca khám'})`
            : undefined
        }
        sublabel={hasDate && isEnabled && selectedSlot ? 'Thời gian có mặt trước 10 phút' : undefined}
        leftIcon="time-outline"
        loading={loadingSlots}
        onPress={onOpenSlotModal}
        onClear={selectedSlot ? onClearSlot : undefined}
      />
    </View>
  )
}
