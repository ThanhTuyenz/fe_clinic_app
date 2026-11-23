import { isUuid } from '../../utils/validation'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { useBookingStore } from '../../store/useBookingStore'
import { bookingService } from '../../services/bookingService'
import { Doctor } from '../../types/doctor'
import { SelectModalOption } from '../../components/common/SelectModal'
import { BookingModalType } from '../../components/booking/BookingModals'
import {
  filterAfterHoursSlots,
} from '../../constants/bookingSlots'
import { formatCurrencyVi, formatDateVi, getTomorrowDateString } from '../../utils/date'

export function useAfterHoursBooking() {
  const router = useRouter()
  const params = useLocalSearchParams<{ specialtyId?: string; branchId?: string }>()
  const { draft, setBranchId, setDoctor, setSpecialty, setDateTime, setIsAfterHours } = useBookingStore()

  // 1. Local State
  const [selectedBranchId, setSelectedBranchId] = useState<string>(params.branchId || draft.branchId || '')
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string | number | undefined>(
    params.specialtyId || draft.specialty?.id
  )
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(draft.doctor || null)
  const tomorrow = getTomorrowDateString()
  const initialDate = draft.doctor && draft.date && draft.date >= tomorrow ? draft.date : ''
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedSlot, setSelectedSlot] = useState<string>(draft.slot || '')
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(draft.slotId)

  const [modalType, setModalType] = useState<BookingModalType>(null)

  // 2. Data Queries
  const { data: bookingInit, isLoading: loadingInit } = useQuery({
    queryKey: ['booking', 'init', 'after-hours', selectedBranchId, selectedSpecialtyId],
    queryFn: () => bookingService.getBookingInit({
      flow: 'after-hours',
      branchId: selectedBranchId || undefined,
      specialtyId: selectedSpecialtyId,
    }),
    staleTime: 5 * 60 * 1000,
  })
  const branches = bookingInit?.branches || []
  const loadingBranches = loadingInit

  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      const defaultBranch = branches.find((b: any) => b.code === 'VC-CENTRAL') || branches[0]
      setSelectedBranchId(defaultBranch.id)
    }
  }, [branches, selectedBranchId])

  const specialties = bookingInit?.specialties || []
  const loadingSpecialties = loadingInit

  const doctors = (bookingInit?.doctors || []).filter((doctor) =>
    !selectedSpecialtyId || String(doctor.specialtyId) === String(selectedSpecialtyId)
  )
  const loadingDoctors = loadingInit

  const { data: bookingSlots, isLoading: loadingDates } = useQuery({
    queryKey: ['booking', 'slots', selectedBranchId, selectedDoctor?.id, 'after-hours'],
    queryFn: () => bookingService.getBookingSlots({
      doctorId: String(selectedDoctor!.id),
      branchId: selectedBranchId,
    }),
    enabled: Boolean(selectedDoctor?.id && selectedBranchId),
    staleTime: 30 * 1000,
  })

  const availableDatesList = useMemo(() => {
    return selectedDoctor ? bookingSlots?.availableDates || [] : []
  }, [selectedDoctor, bookingSlots?.availableDates])

  const { data: selectedBookingSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['booking', 'slots', selectedBranchId, selectedDoctor?.id, selectedDate, 'after-hours'],
    queryFn: () => bookingService.getBookingSlots({
      doctorId: String(selectedDoctor!.id),
      branchId: selectedBranchId,
      date: selectedDate,
    }),
    enabled: Boolean(selectedDoctor?.id && selectedDate),
    staleTime: 30 * 1000,
  })

  const availableSlotsList = useMemo(() => {
    return filterAfterHoursSlots(selectedBookingSlots?.slots || [])
  }, [selectedBookingSlots?.slots])

  const selectedBranchObj = branches.find((b: any) => String(b.id) === String(selectedBranchId))
  const selectedSpecialtyObj = specialties.find((s: any) => String(s.id) === String(selectedSpecialtyId))

  // 3. UI Options
  const branchOptions: SelectModalOption[] = useMemo(
    () =>
      branches.map((b: any) => ({
        id: b.id,
        title: b.name,
        subtitle: b.address,
        badge: b.code === 'VC-CENTRAL' ? 'Trụ sở chính' : undefined,
        badgeColor: 'bg-primary-100',
        extra: b,
      })),
    [branches]
  )

  const specialtyOptions: SelectModalOption[] = useMemo(
    () =>
      specialties.map((s: any) => ({
        id: s.id ?? s._id ?? '',
        title: s.name,
        subtitle: s.description || 'Chuyên khoa khám chất lượng cao',
        extra: s,
      })),
    [specialties]
  )

  const doctorOptions: SelectModalOption[] = useMemo(
    () =>
      doctors.map((d: Doctor) => {
        const docName = d.full_name || d.fullName || d.name || 'Bác sĩ'
        const docTitle = d.title || (d as any).academicRank || 'Bác sĩ'
        const docSpecialty =
          d.specialty_name ||
          (typeof d.specialty === 'object' ? d.specialty?.name : d.specialty) ||
          'Đa khoa'
        const fee = Number(d.consultation_fee || d.price || 300000)

        return {
          id: d.id,
          title: `${docTitle ? `${docTitle} ` : ''}${docName}`,
          subtitle: `${docSpecialty} • Phí khám: ${formatCurrencyVi(fee)}`,
          avatar: d.avatar,
          badgeColor: 'bg-amber-100',
          extra: d,
        }
      }),
    [doctors]
  )

  const dateOptions: SelectModalOption[] = useMemo(
    () =>
      availableDatesList.map((dStr: string) => ({
        id: dStr,
        title: formatDateVi(dStr),
        subtitle: dStr === tomorrow ? 'Ngày mai (Sớm nhất)' : `Lịch khám ngày ${dStr}`,
        badge: dStr === tomorrow ? 'Khuyên chọn' : undefined,
      })),
    [availableDatesList, tomorrow]
  )

  const slotOptions: SelectModalOption[] = useMemo(
    () =>
      availableSlotsList.filter((s) => isUuid(s.representativeSlotId)).map((s) => {
        const startStr = (s.startTime || '').trim().slice(0, 5)
        const endStr = (s.endTime || '').trim().slice(0, 5)
        const timeRange = endStr ? `${startStr} - ${endStr}` : startStr
        const slotId = s.representativeSlotId
        const isAvail = !s.isFull && s.remainingSlots > 0

        return {
          id: slotId,
          title: timeRange,
          subtitle: `Ngoài giờ (17:00 - 20:30) • ${isAvail ? 'Còn trống' : 'Đã kín chỗ'}`,
          badge: 'Ngoài giờ',
          badgeColor: 'bg-amber-100',
          disabled: !isAvail,
          extra: { id: slotId, startTime: startStr, endTime: endStr, timeRange },
        }
      }),
    [availableSlotsList]
  )

  // 4. Handlers
  const handleSelectBranch = (opt: SelectModalOption) => {
    if (String(opt.id) !== selectedBranchId) {
      setSelectedBranchId(String(opt.id))
      setSelectedSpecialtyId(undefined)
      setSelectedDoctor(null)
      setSelectedDate('')
      setSelectedSlot('')
      setSelectedSlotId(undefined)
    }
    setModalType(null)
  }

  const handleSelectSpecialty = (opt: SelectModalOption) => {
    setSelectedSpecialtyId(opt.id)
    setSelectedDoctor(null)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
    setModalType(null)
  }

  const handleSelectDoctorOption = (opt: SelectModalOption) => {
    if (opt.extra) {
      setSelectedDoctor(opt.extra)
      setSelectedDate('')
      setSelectedSlot('')
      setSelectedSlotId(undefined)
    }
    setModalType(null)
  }

  const handleSelectDate = (opt: SelectModalOption) => {
    setSelectedDate(String(opt.id))
    setSelectedSlot('')
    setSelectedSlotId(undefined)
    setModalType(null)
  }

  const handleSelectSlot = (opt: SelectModalOption) => {
    setSelectedSlot(opt.title)
    setSelectedSlotId(typeof opt.extra === 'object' && opt.extra?.id ? opt.extra.id : String(opt.id))
    setModalType(null)
  }

  const handleClearSpecialty = () => {
    setSelectedSpecialtyId(undefined)
    setSelectedDoctor(null)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
  }

  const handleClearDoctor = () => {
    setSelectedDoctor(null)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
  }

  const handleClearSlot = () => {
    setSelectedSlot('')
    setSelectedSlotId(undefined)
  }

  const isFormComplete = Boolean(selectedBranchId && selectedSpecialtyId && selectedDoctor && selectedDate && selectedSlot)

  const handleContinue = () => {
    if (!selectedBranchId) {
      Alert.alert('Chưa chọn chi nhánh', 'Vui lòng chọn cơ sở phòng khám để tiếp tục.')
      return
    }
    if (!selectedSpecialtyId) {
      Alert.alert('Chưa chọn chuyên khoa', 'Vui lòng chọn chuyên khoa khám bệnh.')
      return
    }
    if (!selectedDoctor) {
      Alert.alert('Chưa chọn bác sĩ', 'Vui lòng chọn bác sĩ khám bệnh.')
      return
    }
    if (!selectedDate) {
      Alert.alert('Chưa chọn ngày khám', 'Vui lòng chọn ngày khám bệnh.')
      return
    }
    if (!selectedSlot) {
      Alert.alert('Chưa chọn giờ khám', 'Vui lòng chọn khung giờ khám phù hợp.')
      return
    }

    const selected = availableSlotsList.find((slot) =>
      isUuid(selectedSlotId)
        ? slot.representativeSlotId === selectedSlotId
        : slot.startTime.slice(0, 5) === selectedSlot.slice(0, 5)
    )
    const slotId = selected?.representativeSlotId
    if (!isUuid(slotId) || selected?.isFull || !selected || selected.remainingSlots <= 0) {
      Alert.alert('Cần chọn lại giờ khám', 'Khung giờ không còn hợp lệ. Vui lòng chọn lại giờ khám.')
      return
    }

    setBranchId(selectedBranchId)
    setDoctor(selectedDoctor)
    if (selectedSpecialtyObj) setSpecialty(selectedSpecialtyObj)
    useBookingStore.getState().setBookingMethod('AFTER_HOURS')
    setIsAfterHours(true)
    setDateTime(selectedDate, selectedSlot, slotId)

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.()
    }
    router.push('/booking/patient-info')
  }

  return {
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
    loadingDates,
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
  }
}
