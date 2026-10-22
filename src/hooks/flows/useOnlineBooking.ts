import { isUuid } from '../../utils/validation'
import { filterDoctors } from '../../utils/doctorFilters'
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
  extractDoctorSpecialtyId,
} from '../../constants/bookingSlots'
import { formatCurrencyVi, formatDateVi, getTomorrowDateString } from '../../utils/date'

export function useOnlineBooking() {
  const [priceFilter, setPriceFilter] = useState('all')
  const [experienceFilter, setExperienceFilter] = useState('all')
  const router = useRouter()
  const params = useLocalSearchParams<{ doctorId?: string; branchId?: string }>()
  const { draft, setBranchId, setDoctor, setSpecialty, setDateTime, setIsAfterHours } = useBookingStore()

  // 1. Local State
  const [selectedBranchId, setSelectedBranchId] = useState<string>(params.branchId || draft.branchId || '')
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(draft.doctor || null)
  const tomorrow = getTomorrowDateString()
  const initialDate = draft.doctor && draft.date && draft.date >= tomorrow ? draft.date : ''
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedSlot, setSelectedSlot] = useState<string>(draft.slot || '')
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(draft.slotId)

  const [modalType, setModalType] = useState<BookingModalType>(null)

  // 2. Data Queries
  const { data: bookingInit, isLoading: loadingBranches } = useQuery({
    queryKey: ['booking', 'init', 'online'],
    queryFn: () => bookingService.getBookingInit({ flow: 'online' }),
    staleTime: 5 * 60 * 1000,
  })
  const branches = bookingInit?.branches || []

  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      const defaultBranch = branches.find((b: any) => b.code === 'VC-CENTRAL') || branches[0]
      setSelectedBranchId(defaultBranch.id)
    }
  }, [branches, selectedBranchId])

  const doctors = bookingInit?.doctors || []
  const loadingDoctors = loadingBranches

  useEffect(() => {
    if (params.doctorId && doctors.length > 0) {
      const found = doctors.find((d) => String(d.id) === String(params.doctorId))
      if (found) {
        setSelectedDoctor(found)
        if (found.branchId) setSelectedBranchId(found.branchId)
      }
    }
  }, [params.doctorId, doctors])

  const {
    data: bookingSlots,
    isLoading: loadingSlots,
  } = useQuery({
    queryKey: ['bookingSlots', selectedDoctor?.id, selectedBranchId, selectedDate, 'online-consultation'],
    queryFn: () =>
      bookingService.getBookingSlots({
        doctorId: String(selectedDoctor!.id),
        branchId: selectedBranchId,
        date: selectedDate || undefined,
      }),
    enabled: Boolean(selectedDoctor?.id && selectedBranchId),
    staleTime: 30 * 1000,
  })

  const doctorAvailableDates = bookingSlots?.availableDates || []

  const availableDatesList = useMemo(() => {
    return selectedDoctor ? doctorAvailableDates : []
  }, [selectedDoctor, doctorAvailableDates])

  const availableSlotsList = useMemo(() => {
    return (bookingSlots?.slots || [])
      .filter(() => !selectedDate || !bookingSlots?.date || bookingSlots.date === selectedDate)
  }, [bookingSlots, selectedDate])

  useEffect(() => {
    if (selectedDoctor && !selectedDate && availableDatesList.length > 0) {
      setSelectedDate(availableDatesList[0])
    }
  }, [availableDatesList, selectedDate, selectedDoctor])

  const selectedBranchObj = branches.find((b: any) => String(b.id) === String(selectedBranchId))

  // 4. UI Options
  const doctorOptions: SelectModalOption<Doctor>[] = useMemo(
    () => filterDoctors(doctors, priceFilter, experienceFilter, true).map((doctor) => {
      const specialty = typeof doctor.specialty === 'object'
        ? doctor.specialty?.name
        : doctor.specialty || doctor.specialty_name
      const fee = doctor.onlineConsultationFee ?? doctor.consultation_fee ?? doctor.price
      return {
        id: doctor.id,
        title: doctor.full_name || doctor.fullName || doctor.name || 'Bác sĩ tư vấn',
        subtitle: [specialty, doctor.experience_years ? `${doctor.experience_years} năm kinh nghiệm` : null,
          fee != null ? formatCurrencyVi(fee) : null].filter(Boolean).join(' • '),
        avatar: doctor.avatar,
        badge: doctor.title,
        extra: doctor,
      }
    }),
    [doctors, priceFilter, experienceFilter]
  )

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

  const dateOptions: SelectModalOption[] = useMemo(
    () =>
      availableDatesList.map((dStr: string) => ({
        id: dStr,
        title: formatDateVi(dStr),
        subtitle: dStr === tomorrow ? 'Ngày mai (Sớm nhất)' : `Lịch tư vấn ngày ${dStr}`,
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
        const hour = parseInt(startStr.slice(0, 2), 10)
        const periodLabel = hour >= 17 ? 'Ca tối' : hour >= 12 ? 'Ca chiều' : 'Ca sáng'

        return {
          id: slotId,
          title: timeRange,
          subtitle: `Tư vấn 1:1 • ${isAvail ? 'Khung giờ còn trống' : 'Đã kín chỗ'}`,
          badge: periodLabel,
          badgeColor: hour >= 17 ? 'bg-amber-100' : hour >= 12 ? 'bg-sky-100' : 'bg-primary-100',
          disabled: !isAvail,
          extra: { id: slotId, startTime: startStr, endTime: endStr, timeRange },
        }
      }),
    [availableSlotsList]
  )

  // 5. Handlers
  const handleSelectDoctor = (doc: Doctor) => {
    if (String(doc.id) !== String(selectedDoctor?.id)) {
      setSelectedDoctor(doc)
      setSelectedDate('')
      setSelectedSlot('')
      setSelectedSlotId(undefined)
    }
    setModalType(null)
  }

  const handleSelectBranch = (opt: SelectModalOption) => {
    if (String(opt.id) !== selectedBranchId) {
      setSelectedBranchId(String(opt.id))
      setSelectedDoctor(null)
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

  const handleClearSlot = () => {
    setSelectedSlot('')
    setSelectedSlotId(undefined)
  }

  const isFormComplete = Boolean(selectedBranchId && selectedDoctor && selectedDate && selectedSlot)

  const handleContinue = () => {
    if (!selectedBranchId) {
      Alert.alert('Chưa chọn chi nhánh', 'Vui lòng chọn cơ sở phòng khám để tiếp tục.')
      return
    }
    if (!selectedDoctor) {
      Alert.alert('Chưa chọn bác sĩ', 'Vui lòng chọn bác sĩ tư vấn online.')
      return
    }
    if (!selectedDate) {
      Alert.alert('Chưa chọn ngày tư vấn', 'Vui lòng chọn ngày tư vấn online.')
      return
    }
    if (!selectedSlot) {
      Alert.alert('Chưa chọn giờ tư vấn', 'Vui lòng chọn khung giờ phù hợp.')
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
    const specId = extractDoctorSpecialtyId(selectedDoctor) || 1
    setSpecialty({
      id: specId,
      name: selectedDoctor.specialty_name || (typeof selectedDoctor.specialty === 'string' ? selectedDoctor.specialty : 'Chuyên khoa'),
    })
    useBookingStore.getState().setBookingMethod('ONLINE_CONSULTATION')
    setIsAfterHours(false)
    setDateTime(selectedDate, selectedSlot, slotId)

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.()
    }
    router.push('/booking/patient-info')
  }

  return {
    priceFilter, setPriceFilter, experienceFilter, setExperienceFilter,
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
  }
}
