import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { useBookingStore } from '../../store/useBookingStore'
import { doctorService } from '../../services/doctorService'
import { SelectModalOption } from '../../components/common/SelectModal'
import { BookingModalType } from '../../components/booking/BookingModals'
import { DEFAULT_BOOKING_SLOTS, generateFallbackDates } from '../../constants/bookingSlots'
import { formatCurrencyVi, formatDateVi, getTomorrowDateString } from '../../utils/date'

export function usePackageBooking() {
  const router = useRouter()
  const params = useLocalSearchParams<{ packageId?: string; branchId?: string }>()
  const { draft, setBranchId, setHealthPackage, setDateTime, setIsAfterHours } = useBookingStore()

  // 1. Local State
  const [selectedBranchId, setSelectedBranchId] = useState<string>(params.branchId || draft.branchId || '')
  const [selectedPackage, setSelectedPackage] = useState<any | null>(draft.healthPackage || null)
  const tomorrow = getTomorrowDateString()
  const initialDate = draft.healthPackage && draft.date && draft.date >= tomorrow ? draft.date : ''
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

  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ['healthPackages', selectedBranchId],
    queryFn: () => doctorService.getHealthPackages(selectedBranchId),
  })

  useEffect(() => {
    if (params.packageId && packages.length > 0) {
      const found = packages.find((p: any) => String(p.id) === String(params.packageId))
      if (found) setSelectedPackage(found)
    }
  }, [params.packageId, packages])

  // Package dates
  const { data: packageAvailableDates = [] } = useQuery({
    queryKey: ['packageDates', selectedPackage?.id, selectedBranchId],
    queryFn: () => doctorService.getPackageScheduleDates(String(selectedPackage!.id), selectedBranchId),
    enabled: Boolean(selectedPackage?.id),
  })

  const availableDatesList = useMemo(() => {
    if (packageAvailableDates.length > 0) return packageAvailableDates
    return generateFallbackDates(14)
  }, [packageAvailableDates])

  // Package slots
  const { data: packageSlots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['packageSlots', selectedPackage?.id, selectedDate, selectedBranchId],
    queryFn: () => doctorService.getPackageTimeslots(String(selectedPackage?.id), selectedDate, selectedBranchId),
    enabled: Boolean(selectedPackage?.id && selectedDate),
  })

  const availableSlotsList = useMemo(() => {
    if (packageSlots.length > 0) return packageSlots
    return DEFAULT_BOOKING_SLOTS
  }, [packageSlots])

  const selectedBranchObj = branches.find((b: any) => String(b.id) === String(selectedBranchId))

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

  const packageOptions: SelectModalOption[] = useMemo(
    () =>
      packages.map((p: any) => ({
        id: p.id,
        title: p.name,
        subtitle: `${p.category || 'Gói khám'} • Giá trọn gói: ${formatCurrencyVi(Number(p.price || 1200000))}`,
        badge: p.isPopular ? 'Phổ biến' : undefined,
        extra: p,
      })),
    [packages]
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

  // 4. Handlers
  const handleSelectBranch = (opt: SelectModalOption) => {
    if (String(opt.id) !== selectedBranchId) {
      setSelectedBranchId(String(opt.id))
      setSelectedPackage(null)
      setSelectedDate('')
      setSelectedSlot('')
      setSelectedSlotId(undefined)
    }
    setModalType(null)
  }

  const handleSelectPackage = (opt: SelectModalOption) => {
    setSelectedPackage(opt.extra)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
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

  const handleClearPackage = () => {
    setSelectedPackage(null)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
  }

  const handleClearSlot = () => {
    setSelectedSlot('')
    setSelectedSlotId(undefined)
  }

  const isFormComplete = Boolean(selectedBranchId && selectedPackage && selectedDate && selectedSlot)

  const handleContinue = () => {
    if (!selectedBranchId) {
      Alert.alert('Chưa chọn chi nhánh', 'Vui lòng chọn cơ sở phòng khám để tiếp tục.')
      return
    }
    if (!selectedPackage) {
      Alert.alert('Chưa chọn gói khám', 'Vui lòng chọn một gói khám sức khỏe phù hợp.')
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
    setHealthPackage(selectedPackage)
    useBookingStore.getState().setBookingMethod('HEALTH_PACKAGE')
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
  }
}
