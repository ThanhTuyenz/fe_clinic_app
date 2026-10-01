import React from 'react'
import { SelectModal, SelectModalOption } from '../common/SelectModal'
import { formatDateVi } from '../../utils/date'

export type BookingModalType = 'branch' | 'specialty' | 'doctor' | 'package' | 'date' | 'slot' | null

interface BookingModalsProps {
  modalType: BookingModalType
  onClose: () => void

  // Branch
  branchOptions: SelectModalOption[]
  selectedBranchId: string
  onSelectBranch: (option: SelectModalOption) => void

  // Specialty
  specialtyOptions: SelectModalOption[]
  selectedSpecialtyId?: string
  onSelectSpecialty: (option: SelectModalOption) => void

  // Doctor
  doctorOptions: SelectModalOption[]
  selectedDoctorId?: string | number
  loadingDoctors: boolean
  specialtyName?: string
  onSelectDoctor: (option: SelectModalOption) => void

  // Package
  packageOptions: SelectModalOption[]
  selectedPackageId?: string | number
  loadingPackages: boolean
  onSelectPackage: (option: SelectModalOption) => void

  // Date
  dateOptions: SelectModalOption[]
  selectedDate: string
  onSelectDate: (option: SelectModalOption) => void

  // Slot
  slotOptions: SelectModalOption[]
  selectedSlotId?: string
  selectedSlot: string
  loadingSlots: boolean
  onSelectSlot: (option: SelectModalOption) => void
}

export const BookingModals: React.FC<BookingModalsProps> = ({
  modalType,
  onClose,
  branchOptions,
  selectedBranchId,
  onSelectBranch,
  specialtyOptions,
  selectedSpecialtyId,
  onSelectSpecialty,
  doctorOptions,
  selectedDoctorId,
  loadingDoctors,
  specialtyName,
  onSelectDoctor,
  packageOptions,
  selectedPackageId,
  loadingPackages,
  onSelectPackage,
  dateOptions,
  selectedDate,
  onSelectDate,
  slotOptions,
  selectedSlotId,
  selectedSlot,
  loadingSlots,
  onSelectSlot,
}) => {
  return (
    <>
      {/* Modal: Chi nhánh */}
      <SelectModal
        visible={modalType === 'branch'}
        onClose={onClose}
        title="Chọn chi nhánh tiếp đón"
        subtitle="Hệ thống đa chi nhánh VitaCare Clinic"
        searchPlaceholder="Tìm kiếm chi nhánh, quận..."
        options={branchOptions}
        selectedId={selectedBranchId}
        onSelect={onSelectBranch}
      />

      {/* Modal: Chuyên khoa */}
      <SelectModal
        visible={modalType === 'specialty'}
        onClose={onClose}
        title="Chọn chuyên khoa khám"
        subtitle="Bắt buộc chọn 1 chuyên khoa cụ thể để tiếp tục"
        searchPlaceholder="Tìm kiếm tên chuyên khoa..."
        options={specialtyOptions}
        selectedId={selectedSpecialtyId}
        onSelect={onSelectSpecialty}
      />

      {/* Modal: Bác sĩ */}
      <SelectModal
        visible={modalType === 'doctor'}
        onClose={onClose}
        title="Chọn bác sĩ điều trị"
        subtitle={
          specialtyName
            ? `Chuyên khoa: ${specialtyName}`
            : 'Đội ngũ bác sĩ chuyên khoa VitaCare'
        }
        searchPlaceholder="Tìm kiếm theo tên bác sĩ, học vị..."
        options={doctorOptions}
        selectedId={selectedDoctorId}
        loading={loadingDoctors}
        emptyText="Không có bác sĩ khả dụng cho chuyên khoa này tại cơ sở đã chọn"
        onSelect={onSelectDoctor}
      />

      {/* Modal: Gói khám */}
      <SelectModal
        visible={modalType === 'package'}
        onClose={onClose}
        title="Chọn gói khám sức khỏe"
        subtitle="Tầm soát và khám tổng quát định kỳ"
        searchPlaceholder="Tìm kiếm gói khám..."
        options={packageOptions}
        selectedId={selectedPackageId}
        loading={loadingPackages}
        onSelect={onSelectPackage}
      />

      {/* Modal: Ngày khám */}
      <SelectModal
        visible={modalType === 'date'}
        onClose={onClose}
        title="Chọn ngày khám bệnh"
        subtitle="Các ngày làm việc khả dụng trong hệ thống"
        options={dateOptions}
        selectedId={selectedDate}
        onSelect={onSelectDate}
      />

      {/* Modal: Khung giờ */}
      <SelectModal
        visible={modalType === 'slot'}
        onClose={onClose}
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
        onSelect={onSelectSlot}
      />
    </>
  )
}
