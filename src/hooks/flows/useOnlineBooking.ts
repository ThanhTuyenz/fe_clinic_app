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
  extractDoctorSpecialtyId,
  generateFallbackDates,
} from '../../constants/bookingSlots'
import { formatCurrencyVi, formatDateVi, getTomorrowDateString } from '../../utils/date'

export function useOnlineBooking() {
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
  const [doctorSearch, setDoctorSearch] = useState('')

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

  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors', selectedBranchId, 'online-consultation'],
    queryFn: () => doctorService.getDoctors(selectedBranchId),
    enabled: Boolean(selectedBranchId),
  })

  useEffect(() => {
    if (params.doctorId && doctors.length > 0) {
      const found = doctors.find((d) => String(d.id) === String(params.doctorId))
      if (found) {
        setSelectedDoctor(found)
        if (found.branchId) setSelectedBranchId(found.branchId)
      }
    }
  }, [params.doctorId, doctors])

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
    queryKey: ['doctorSlots', selectedDoctor?.id, selectedDate, selectedBranchId, 'online'],
    queryFn: () => doctorService.getAvailability(selectedDoctor!.id, selectedDate, selectedBranchId),
    enabled: Boolean(selectedDoctor?.id && selectedDate),
  })

  const availableSlotsList = useMemo(() => {
    if (doctorSlots.length > 0) return doctorSlots
    return DEFAULT_BOOKING_SLOTS
  }, [doctorSlots])

  // 3. Search & Filter
  const displayedDoctors = useMemo(() => {
    if (!doctorSearch.trim()) return doctors
    const q = doctorSearch.trim().toLowerCase()
    return doctors.filter((d) => {
      const name = (d.fullName || d.name || '').toLowerCase()
      const spec = (d.specialty_name || (typeof d.specialty === 'string' ? d.specialty : '') || '').toLowerCase()
      return name.includes(q) || spec.includes(q)
    })
  }, [doctors, doctorSearch])

  const selectedBranchObj = branches.find((b: any) => String(b.id) === String(selectedBranchId))

  // 4. UI Options
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
      availableSlotsList.map((s: any, idx: number) => {
        const startStr = (typeof s === 'string' ? s : s.startTime || '').trim().slice(0, 5)
        const endStr = (typeof s === 'object' && s.endTime ? s.endTime : '').trim().slice(0, 5)
        const timeRange = endStr ? `${startStr} - ${endStr}` : startStr
        const slotId = typeof s === 'object' && s.id ? s.id : `slot-${idx}`
        const isAvail = typeof s === 'object' && s.isAvailable !== undefined ? Boolean(s.isAvailable) : true
        const hour = parseInt(startStr.slice(0, 2), 10)
        const periodLabel = hour >= 17 ? 'Ca tối' : hour >= 12 ? 'Ca chiều' : 'Ca sáng'

        return {
          id: slotId,
          title: timeRange,
          subtitle: `Tư vấn 1:1 • ${isAvail ? 'Khung giờ còn trống' : 'Đã kín chỗ'}`,
          badge: periodLabel,
          badgeColor: hour >= 17 ? 'bg-amber-100' : hour >= 12 ? 'bg-sky-100' : 'bg-emerald-100',
          disabled: !isAvail,
          extra: { id: slotId, startTime: startStr, endTime: endStr, timeRange },
        }
      }),
    [availableSlotsList]
  )

  // 5. Handlers
  const handleSelectDoctor = (doc: Doctor) => {
    setSelectedDoctor(doc)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
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
    tomorrow,
    selectedBranchId,
    selectedBranchObj,
    selectedDoctor,
    selectedDate,
    selectedSlot,
    selectedSlotId,
    isFormComplete,

    // Search & Filter
    doctorSearch,
    setDoctorSearch,
    doctors,
    displayedDoctors,

    // Loading
    loadingBranches,
    loadingDoctors,
    loadingSlots,

    // Modal
    modalType,
    setModalType,

    // Options
    branchOptions,
    dateOptions,
    slotOptions,

    // Actions
    handleSelectDoctor,
    handleSelectBranch,
    handleSelectDate,
    handleSelectSlot,
    handleClearDoctor,
    handleClearSlot,
    handleContinue,
  }
}
