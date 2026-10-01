import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { useBookingStore } from '../../store/useBookingStore'
import { doctorService } from '../../services/doctorService'
import { Doctor } from '../../types/doctor'
import { SelectModalOption } from '../../components/common/SelectModal'
import { BookingModalType } from '../../components/booking/BookingModals'
import {
  DEFAULT_BOOKING_SLOTS,
  filterAfterHoursSlots,
  generateFallbackDates,
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
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => doctorService.getBranches(),
  })

  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      const defaultBranch = branches.find((b: any) => b.code === 'VC-CENTRAL') || branches[0]
      setSelectedBranchId(defaultBranch.id)
    }
  }, [branches, selectedBranchId])

  const { data: specialties = [], isLoading: loadingSpecialties } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => doctorService.getSpecialties(),
  })

  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors', selectedBranchId, selectedSpecialtyId, 'after-hours'],
    queryFn: () => doctorService.getDoctors(selectedBranchId, selectedSpecialtyId as any),
    enabled: Boolean(selectedBranchId && selectedSpecialtyId),
  })

  const { data: doctorAvailableDates = [] } = useQuery({
    queryKey: ['doctorDates', selectedDoctor?.id, selectedBranchId],
    queryFn: () => doctorService.getDoctorAvailableDates(String(selectedDoctor!.id), selectedBranchId),
    enabled: Boolean(selectedDoctor?.id),
  })

  const availableDatesList = useMemo(() => {
    if (selectedDoctor && doctorAvailableDates.length > 0) {
      return doctorAvailableDates
    }
    return generateFallbackDates(14)
  }, [selectedDoctor, doctorAvailableDates])

  const { data: doctorSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['doctorSlots', selectedDoctor?.id, selectedDate, selectedBranchId, 'after-hours'],
    queryFn: () => doctorService.getAvailability(selectedDoctor!.id, selectedDate, selectedBranchId),
    enabled: Boolean(selectedDoctor?.id && selectedDate),
  })

  const availableSlotsList = useMemo(() => {
    const raw = doctorSlots.length > 0 ? doctorSlots : DEFAULT_BOOKING_SLOTS
    return filterAfterHoursSlots(raw)
  }, [doctorSlots])

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
        badgeColor: 'bg-emerald-100',
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
          badge: d.rating ? `★ ${Number(d.rating).toFixed(1)}` : undefined,
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
      availableSlotsList.map((s: any, idx: number) => {
        const startStr = (typeof s === 'string' ? s : s.startTime || '').trim().slice(0, 5)
        const endStr = (typeof s === 'object' && s.endTime ? s.endTime : '').trim().slice(0, 5)
        const timeRange = endStr ? `${startStr} - ${endStr}` : startStr
        const slotId = typeof s === 'object' && s.id ? s.id : `slot-${idx}`
        const isAvail = typeof s === 'object' && s.isAvailable !== undefined ? Boolean(s.isAvailable) : true

        return {
          id: slotId,
          title: timeRange,
          subtitle: `Ngoài giờ (17:30 - 20:30) • ${isAvail ? 'Còn trống' : 'Đã kín chỗ'}`,
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

    let slotId = selectedSlotId
    if (!slotId) {
      const found = availableSlotsList.find((s: any) => {
        const t = typeof s === 'string' ? s : s.startTime
        return t && t.slice(0, 5) === selectedSlot.slice(0, 5)
      })
      if (found && typeof found === 'object' && found.id) {
        slotId = found.id
      }
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
