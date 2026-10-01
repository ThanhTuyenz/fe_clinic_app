import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { useBookingStore } from '../../store/useBookingStore'
import { doctorService } from '../../services/doctorService'
import { SelectModalOption } from '../../components/common/SelectModal'
import { BookingModalType } from '../../components/booking/BookingModals'
import { DEFAULT_BOOKING_SLOTS, generateFallbackDates } from '../../constants/bookingSlots'
import { formatDateVi, getTomorrowDateString } from '../../utils/date'

export function useDoctorTimeBooking() {
  const router = useRouter()
  const { draft, setDateTime, setIsAfterHours } = useBookingStore()

  const doctor = draft.doctor
  const branchId = draft.branchId || ''

  // 1. Check if doctor is selected
  useEffect(() => {
    if (!doctor) {
      router.replace('/booking/doctor')
    }
  }, [doctor, router])

  // 2. Local State
  const tomorrow = getTomorrowDateString()
  const initialDate = doctor && draft.date && draft.date >= tomorrow ? draft.date : ''
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedSlot, setSelectedSlot] = useState<string>(draft.slot || '')
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(draft.slotId)
  const [modalType, setModalType] = useState<BookingModalType>(null)

  // 3. Available Dates for selected doctor
  const { data: doctorAvailableDates = [], isLoading: loadingDates } = useQuery({
    queryKey: ['doctorDates', doctor?.id, branchId],
    queryFn: () => doctorService.getDoctorAvailableDates(String(doctor!.id), branchId),
    enabled: Boolean(doctor?.id),
  })

  const availableDatesList = useMemo(() => {
    if (doctor && doctorAvailableDates.length > 0) {
      return doctorAvailableDates
    }
    return generateFallbackDates(14)
  }, [doctor, doctorAvailableDates])

  // 4. Available Slots for selected doctor on the chosen date
  const { data: doctorSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['doctorSlots', doctor?.id, selectedDate, branchId],
    queryFn: () => doctorService.getAvailability(doctor!.id, selectedDate, branchId),
    enabled: Boolean(doctor?.id && selectedDate),
  })

  const availableSlotsList = useMemo(() => {
    if (doctorSlots.length > 0) return doctorSlots
    return DEFAULT_BOOKING_SLOTS
  }, [doctorSlots])

  // 5. Modal Options
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
        const hour = parseInt(startStr.slice(0, 2), 10)
        const periodLabel = hour >= 17 ? 'Ca tối' : hour >= 12 ? 'Ca chiều' : 'Ca sáng'

        return {
          id: slotId,
          title: timeRange,
          subtitle: `${periodLabel} • ${isAvail ? 'Khung giờ còn trống' : 'Đã kín chỗ'}`,
          badge: periodLabel,
          badgeColor: hour >= 17 ? 'bg-amber-100' : hour >= 12 ? 'bg-sky-100' : 'bg-emerald-100',
          disabled: !isAvail,
          extra: { id: slotId, startTime: startStr, endTime: endStr, timeRange },
        }
      }),
    [availableSlotsList]
  )

  // 6. Handlers
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

  const handleChangeDoctor = () => {
    router.back()
  }

  const isFormComplete = Boolean(doctor && selectedDate && selectedSlot)

  const handleContinue = () => {
    if (!doctor) {
      Alert.alert('Chưa chọn bác sĩ', 'Vui lòng quay lại chọn bác sĩ khám bệnh.')
      router.replace('/booking/doctor')
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

    setIsAfterHours(false)
    setDateTime(selectedDate, selectedSlot, slotId)

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.()
    }

    // Chuyển sang màn hình Thông tin người khám (Screen 3)
    router.push('/booking/patient-info')
  }

  return {
    doctor,
    tomorrow,
    selectedDate,
    selectedSlot,
    selectedSlotId,
    modalType,
    setModalType,
    loadingDates,
    loadingSlots,
    dateOptions,
    slotOptions,
    isFormComplete,
    handleSelectDate,
    handleSelectSlot,
    handleClearSlot,
    handleChangeDoctor,
    handleContinue,
  }
}
