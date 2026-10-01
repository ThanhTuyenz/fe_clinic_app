import React from 'react'
import { SelectInput } from '../common/SelectInput'
import { Doctor, Specialty } from '../../types/doctor'
import { formatCurrencyVi } from '../../utils/date'

interface SpecialtyDoctorSectionProps {
  hasBranch: boolean
  hasSpecialty: boolean
  selectedSpecialtyObj?: Specialty | { id: string | number; name: string }
  selectedDoctor: Doctor | null
  loadingSpecialties: boolean
  loadingDoctors: boolean
  onOpenSpecialtyModal: () => void
  onOpenDoctorModal: () => void
  onClearSpecialty: () => void
  onClearDoctor: () => void
}

export const SpecialtyDoctorSection: React.FC<SpecialtyDoctorSectionProps> = ({
  hasBranch,
  hasSpecialty,
  selectedSpecialtyObj,
  selectedDoctor,
  loadingSpecialties,
  loadingDoctors,
  onOpenSpecialtyModal,
  onOpenDoctorModal,
  onClearSpecialty,
  onClearDoctor,
}) => {
  const doctorName = selectedDoctor
    ? `${selectedDoctor.title ? `${selectedDoctor.title} ` : ''}${
        selectedDoctor.full_name || selectedDoctor.fullName || selectedDoctor.name
      }`
    : undefined

  const doctorSublabel = selectedDoctor
    ? `${selectedDoctor.specialty_name || selectedSpecialtyObj?.name || 'Chuyên khoa'} • Phí khám: ${formatCurrencyVi(
        Number(selectedDoctor.price || selectedDoctor.consultation_fee || 300000)
      )}`
    : !hasSpecialty
      ? 'Cần chọn chuyên khoa trước khi chọn bác sĩ'
      : undefined

  return (
    <>
      {/* Select Chuyên khoa */}
      <SelectInput
        label="Chuyên khoa khám"
        required
        disabled={!hasBranch}
        placeholder={!hasBranch ? 'Chọn chi nhánh trước...' : 'Chọn chuyên khoa'}
        value={selectedSpecialtyObj ? selectedSpecialtyObj.name : undefined}
        sublabel={
          selectedSpecialtyObj
            ? 'Chuyên khoa đã chọn'
            : hasBranch
              ? 'Bắt buộc chọn 1 chuyên khoa cụ thể'
              : undefined
        }
        leftIcon="medkit-outline"
        loading={loadingSpecialties}
        onPress={onOpenSpecialtyModal}
        onClear={selectedSpecialtyObj ? onClearSpecialty : undefined}
      />

      {/* Select Bác sĩ */}
      <SelectInput
        label="Bác sĩ điều trị"
        required
        disabled={!hasBranch || !hasSpecialty}
        placeholder={
          !hasBranch
            ? 'Vui lòng chọn chi nhánh trước'
            : !hasSpecialty
              ? 'Vui lòng chọn chuyên khoa trước'
              : 'Chọn bác sĩ chuyên khoa'
        }
        value={doctorName}
        sublabel={doctorSublabel}
        leftIcon="person-outline"
        loading={loadingDoctors}
        onPress={onOpenDoctorModal}
        onClear={selectedDoctor ? onClearDoctor : undefined}
      />
    </>
  )
}
