import { isUuid } from '../../utils/validation'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { useBookingStore } from '../../store/useBookingStore'
import { bookingService } from '../../services/bookingService'
import { SelectModalOption } from '../../components/common/SelectModal'
import { BookingModalType } from '../../components/booking/BookingModals'
import { formatDateVi, getTomorrowDateString } from '../../utils/date'

export function useDoctorTimeBooking(flow: 'doctor' | 'online' = 'doctor') {
  const router = useRouter()
  const { draft, setDateTime, setIsAfterHours } = useBookingStore()

  const doctor = draft.doctor
  const branchId = draft.branchId || ''
  const doctorRoute = flow === 'online' ? '/booking/online' : '/booking/doctor'

  // 1. Check if doctor is selected
  useEffect(() => {
    if (!doctor) {
      router.replace(doctorRoute)
    }
  }, [doctor, router, doctorRoute])

  // 2. Local State
  const tomorrow = getTomorrowDateString()
  const initialDate = doctor && draft.date && draft.date >= tomorrow ? draft.date : ''
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedSlot, setSelectedSlot] = useState<string>(draft.slot || '')
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(draft.slotId)
  const [modalType, setModalType] = useState<BookingModalType>(null)

  // 3. Available Dates for selected doctor
  const { data: bookingSlots, isLoading: loadingDates } = useQuery({
    queryKey: ['booking', 'slots', branchId, doctor?.id],
    queryFn: () => bookingService.getBookingSlots({ doctorId: String(doctor!.id), branchId }),
    enabled: Boolean(doctor?.id && branchId),
    staleTime: 30 * 1000,
  })

  const availableDatesList = useMemo(
    () => (doctor ? bookingSlots?.availableDates || [] : []),
    [doctor, bookingSlots?.availableDates]
  )

  // 4. Available Slots for selected doctor on the chosen date
  const { data: selectedBookingSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['booking', 'slots', branchId, doctor?.id, selectedDate],
    queryFn: () => bookingService.getBookingSlots({
      doctorId: String(doctor!.id),
      branchId,
      date: selectedDate,
    }),
    enabled: Boolean(doctor?.id && branchId && selectedDate),
    staleTime: 30 * 1000,
  })

  const availableSlotsList = useMemo(
    () => selectedBookingSlots?.slots || [],
    [selectedBookingSlots?.slots]
  )

  // 5. Modal Options
  const dateOptions: SelectModalOption[] = useMemo(
    () =>
      availableDatesList.map((dStr: string) => ({
        id: dStr,
        title: formatDateVi(dStr),
        subtitle: dStr === tomorrow ? 'Ngày mai (Sớm nhất)' : `${flow === 'online' ? 'Lịch tư vấn' : 'Lịch khám'} ngày ${dStr}`,
        badge: dStr === tomorrow ? 'Khuyên chọn' : undefined,
      })),
    [availableDatesList, tomorrow, flow]
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
          subtitle: `${periodLabel} • ${isAvail ? 'Khung giờ còn trống' : 'Đã kín chỗ'}`,
          badge: periodLabel,
          badgeColor: hour >= 17 ? 'bg-amber-100' : hour >= 12 ? 'bg-sky-100' : 'bg-primary-100',
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
    router.navigate(doctorRoute)
  }

  const isFormComplete = Boolean(doctor && selectedDate && selectedSlot)

  const handleContinue = () => {
    if (!doctor) {
      Alert.alert('Chưa chọn bác sĩ', flow === 'online' ? 'Vui lòng quay lại chọn bác sĩ tư vấn.' : 'Vui lòng quay lại chọn bác sĩ khám bệnh.')
      router.replace(doctorRoute)
      return
    }
    if (!selectedDate) {
      Alert.alert(flow === 'online' ? 'Chưa chọn ngày tư vấn' : 'Chưa chọn ngày khám', 'Vui lòng chọn ngày phù hợp để tiếp tục.')
      return
    }
    if (!selectedSlot) {
      Alert.alert(flow === 'online' ? 'Chưa chọn giờ tư vấn' : 'Chưa chọn giờ khám', 'Vui lòng chọn khung giờ phù hợp.')
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

    setIsAfterHours(false)
    useBookingStore.getState().setBookingMethod(flow === 'online' ? 'ONLINE_CONSULTATION' : 'CONSULTATION')
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
