import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { useBookingStore } from '../../store/useBookingStore'
import { bookingService } from '../../services/bookingService'
import { resolveDoctorAvatarUrl } from '../../services/doctorService'
import { Doctor } from '../../types/doctor'
import { SelectModalOption } from '../../components/common/SelectModal'
import { BookingModalType } from '../../components/booking/BookingModals'
import { formatCurrencyVi, formatDateVi, getTomorrowDateString } from '../../utils/date'

export function useSpecialtyBooking() {
  const router = useRouter()
  const params = useLocalSearchParams<{ specialtyId?: string; branchId?: string; serviceId?: string }>()
  const {
    draft,
    setBranchId,
    setDoctor,
    setSpecialty,
    setSpecialtyService,
    setDateTime,
    setIsAfterHours,
  } = useBookingStore()

  // 1. Local State (Theo đúng thứ tự tuần tự: Chuyên khoa -> Chi nhánh -> Dịch vụ khám -> Ngày -> Giờ -> Bác sĩ)
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string | number | undefined>(
    params.specialtyId || draft.specialty?.id
  )
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    params.branchId || draft.branchId || ''
  )
  const [selectedService, setSelectedServiceState] = useState<any | null>(
    draft.specialtyService || null
  )
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(draft.doctor || null)
  const tomorrow = getTomorrowDateString()
  const initialDate = draft.date && draft.date >= tomorrow ? draft.date : ''
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedSlot, setSelectedSlot] = useState<string>(draft.slot || '')
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(draft.slotId)

  const [modalType, setModalType] = useState<BookingModalType | 'service'>(null)

  // 2. Data Queries
  // Danh sách chuyên khoa
  const { data: bookingInit, isLoading: loadingInit } = useQuery({
    queryKey: ['booking', 'init', 'specialty', selectedBranchId, selectedSpecialtyId],
    queryFn: () => bookingService.getBookingInit({
      flow: 'specialty',
      branchId: selectedBranchId || undefined,
      specialtyId: selectedSpecialtyId,
    }),
    staleTime: 5 * 60 * 1000,
  })
  const specialties = bookingInit?.specialties || []
  const loadingSpecialties = loadingInit

  // Danh sách chi nhánh
  const branches = bookingInit?.branches || []
  const loadingBranches = loadingInit

  // Danh sách gói dịch vụ khám theo Chuyên khoa + Chi nhánh
  const specialtyServices = useMemo(
    () => (bookingInit?.services || []).filter((service: any) =>
      selectedSpecialtyId != null &&
      String(service.specialtyId) === String(selectedSpecialtyId) &&
      (!selectedBranchId ||
        String(service.branchId) === String(selectedBranchId) ||
        service.branches?.some((branch: any) => String(branch.id) === String(selectedBranchId)))
    ),
    [bookingInit?.services, selectedBranchId, selectedSpecialtyId]
  )
  const loadingServices = loadingInit

  // Chỉ reset dịch vụ nếu dịch vụ đang chọn không còn hợp lệ trong danh sách mới
  useEffect(() => {
    if (bookingInit && !loadingInit && selectedService) {
      const stillValid = specialtyServices.some((s: any) => String(s.id) === String(selectedService.id))
      if (!stillValid) {
        setSelectedServiceState(null)
        setSelectedDate('')
        setSelectedSlot('')
        setSelectedSlotId(undefined)
        setSelectedDoctor(null)
      }
    }
  }, [bookingInit, loadingInit, specialtyServices, selectedService])

  // Booking Slots API (BFF /api/v1/booking/slots) - Chỉ gọi khi đã chọn đủ Chuyên khoa, Chi nhánh và Dịch vụ
  const { data: bookingSlotsData, isLoading: loadingSlots } = useQuery({
    queryKey: ['bookingSlots', selectedBranchId, selectedSpecialtyId, selectedService?.id, selectedDate],
    queryFn: () =>
      bookingService.getBookingSlots({
        branchId: selectedBranchId,
        specialtyId: selectedSpecialtyId,
        servicePackageId: selectedService?.id,
        date: selectedDate || undefined,
      }),
    enabled: Boolean(selectedBranchId && selectedSpecialtyId && selectedService &&
      specialtyServices.some((service: any) => String(service.id) === String(selectedService.id))),
    staleTime: 30 * 1000,
  })

  const availableDatesList = useMemo(() => {
    return bookingSlotsData?.availableDates || []
  }, [bookingSlotsData?.availableDates])

  const availableSlotsList = useMemo(() => {
    return bookingSlotsData?.slots || []
  }, [bookingSlotsData?.slots])

  const selectedSpecialtyObj = specialties.find((s: any) => String(s.id) === String(selectedSpecialtyId))
  const selectedBranchObj = branches.find((b: any) => String(b.id) === String(selectedBranchId))

  // Tự động chọn khung giờ khả dụng đầu tiên CHỈ KHI người dùng đã chọn ngày khám
  useEffect(() => {
    if (availableSlotsList.length > 0 && selectedDate) {
      const isCurrentSlotValid =
        selectedSlot &&
        availableSlotsList.some((s) => {
          const startStr = (s.startTime || '').trim().slice(0, 5)
          return (
            startStr === selectedSlot.slice(0, 5) ||
            s.label === selectedSlot ||
            s.representativeSlotId === selectedSlotId
          )
        })

      if (!isCurrentSlotValid) {
        const firstAvailSlot =
          availableSlotsList.find((s) => !s.isFull && (s.remainingSlots === undefined || s.remainingSlots > 0)) ||
          availableSlotsList[0]

        if (firstAvailSlot) {
          const startStr = (firstAvailSlot.startTime || '').trim().slice(0, 5)
          const endStr = (firstAvailSlot.endTime || '').trim().slice(0, 5)
          const timeRange = endStr ? `${startStr} - ${endStr}` : startStr
          setSelectedSlot(timeRange)
          const slotDoctorsInFirst = firstAvailSlot.doctors || []
          if (slotDoctorsInFirst.length > 0) {
            const firstDoc = slotDoctorsInFirst[0]
            setSelectedSlotId(firstDoc.slotId || firstAvailSlot.representativeSlotId)
            setSelectedDoctor({
              id: firstDoc.doctorId,
              fullName: firstDoc.doctorName,
              name: firstDoc.doctorName,
              title: firstDoc.academicRank || 'Bác sĩ',
              specialty: selectedSpecialtyObj?.name || 'Chuyên khoa',
              specialty_name: selectedSpecialtyObj?.name || 'Chuyên khoa',
              consultation_fee: selectedService?.price
                ? Number(selectedService.price)
                : firstDoc.consultationFee || 300000,
              price: selectedService?.price
                ? Number(selectedService.price)
                : firstDoc.consultationFee || 300000,
              rating: 4.9,
              experience_years: firstDoc.experienceYears || 0,
              avatar: resolveDoctorAvatarUrl(firstDoc.avatarUrl || undefined),
              roomId: firstDoc.roomId || undefined,
              roomName: firstDoc.roomName || undefined,
              slotId: firstDoc.slotId,
            } as any)
          } else {
            setSelectedSlotId(firstAvailSlot.representativeSlotId)
          }
        }
      }
    }
  }, [availableSlotsList, selectedDate, selectedSlot, selectedSlotId, selectedSpecialtyObj?.name, selectedService?.price])

  // Current Slot & Available Doctors in that Slot
  const currentSlot = useMemo(() => {
    if (!selectedSlot || availableSlotsList.length === 0) return null
    const startStr = selectedSlot.slice(0, 5)
    return (
      availableSlotsList.find(
        (s) =>
          s.startTime === startStr ||
          s.label === selectedSlot ||
          s.representativeSlotId === selectedSlotId
      ) || null
    )
  }, [selectedSlot, selectedSlotId, availableSlotsList])

  const slotDoctors: Doctor[] = useMemo(() => {
    if (!currentSlot?.doctors || currentSlot.doctors.length === 0) return []
    return currentSlot.doctors.map((d) => ({
      id: d.doctorId,
      fullName: d.doctorName,
      name: d.doctorName,
      title: d.academicRank || 'Bác sĩ',
      specialty: selectedSpecialtyObj?.name || 'Chuyên khoa',
      specialty_name: selectedSpecialtyObj?.name || 'Chuyên khoa',
      consultation_fee: selectedService?.price ? Number(selectedService.price) : d.consultationFee || 300000,
      price: selectedService?.price ? Number(selectedService.price) : d.consultationFee || 300000,
      rating: 4.9,
      experience_years: d.experienceYears || 0,
      avatar: resolveDoctorAvatarUrl(d.avatarUrl || undefined),
      roomId: d.roomId || undefined,
      roomName: d.roomName || undefined,
      slotId: d.slotId,
    }))
  }, [currentSlot?.doctors, selectedSpecialtyObj?.name, selectedService?.price])

  // Auto-sync selected doctor when slot changes
  useEffect(() => {
    if (slotDoctors.length > 0) {
      const isCurrentDoctorInSlot =
        selectedDoctor && slotDoctors.some((d) => String(d.id) === String(selectedDoctor.id))
      if (!isCurrentDoctorInSlot) {
        const firstDoc = slotDoctors[0]
        setSelectedDoctor(firstDoc)
        if ((firstDoc as any).slotId) {
          setSelectedSlotId((firstDoc as any).slotId)
        }
      }
    }
  }, [slotDoctors, selectedDoctor])

  // 3. UI Options
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

  const branchOptions: SelectModalOption[] = useMemo(
    () =>
      branches.map((b: any) => ({
        id: b.id,
        title: b.name,
        subtitle: b.address,
        badge: b.code === 'VC-CENTRAL' ? 'Trụ sở chính' : undefined,
        badgeColor: 'bg-slate-100 border border-slate-200',
        extra: b,
      })),
    [branches]
  )

  const serviceOptions: SelectModalOption[] = useMemo(
    () =>
      specialtyServices.map((s: any) => {
        const price = Number(s.price || 300000)
        return {
          id: s.id,
          title: s.name,
          subtitle: s.description || 'Khám & tư vấn chuyên khoa',
          badge: formatCurrencyVi(price),
          badgeColor: 'bg-slate-100 border border-slate-200',
          extra: s,
        }
      }),
    [specialtyServices]
  )

  const dateOptions: SelectModalOption[] = useMemo(
    () =>
      availableDatesList.map((dStr: string) => ({
        id: dStr,
        title: formatDateVi(dStr),
        subtitle: dStr === tomorrow ? 'Ngày mai (Sớm nhất)' : `Lịch khám ngày ${dStr}`,
        badge: dStr === tomorrow ? 'Sớm nhất' : undefined,
        badgeColor: 'bg-slate-100 border border-slate-200',
      })),
    [availableDatesList, tomorrow]
  )

  const slotOptions: SelectModalOption[] = useMemo(
    () =>
      availableSlotsList.map((s: any, idx: number) => {
        const startStr = (s.startTime || '').trim().slice(0, 5)
        const endStr = (s.endTime || '').trim().slice(0, 5)
        const timeRange = endStr ? `${startStr} - ${endStr}` : startStr
        const slotId = s.representativeSlotId || `slot-${idx}`
        const isAvail = !s.isFull && (s.remainingSlots === undefined || s.remainingSlots > 0)
        const hour = parseInt(startStr.slice(0, 2), 10)
        const periodLabel =
          s.period === 'EVENING' || hour >= 17
            ? 'Ca tối'
            : s.period === 'AFTERNOON' || hour >= 12
              ? 'Ca chiều'
              : 'Ca sáng'

        const docCount = s.doctors?.length || 0
        const docCountLabel = docCount > 0 ? ` • ${docCount} BS trực` : ''

        return {
          id: slotId,
          title: timeRange,
          subtitle: `${periodLabel} • ${isAvail ? `Còn ${s.remainingSlots || 1} chỗ${docCountLabel}` : 'Đã kín chỗ'}`,
          badge: periodLabel,
          badgeColor: 'bg-slate-100 border border-slate-200',
          disabled: !isAvail,
          extra: { id: slotId, startTime: startStr, endTime: endStr, timeRange, doctors: s.doctors },
        }
      }),
    [availableSlotsList]
  )

  const doctorOptions: SelectModalOption[] = useMemo(
    () =>
      slotDoctors.map((d: Doctor) => {
        const docName = `${d.title ? `${d.title} ` : 'BS. '}${d.fullName || d.name || 'Bác sĩ'}`
        const roomInfo = (d as any).roomName ? `Phòng: ${(d as any).roomName}` : ''
        const expInfo = d.experience_years ? `${d.experience_years} năm KN` : ''
        const subtitleParts = [roomInfo, d.specialty_name || selectedSpecialtyObj?.name, expInfo].filter(Boolean)

        return {
          id: d.id,
          title: docName,
          subtitle: subtitleParts.join(' • ') || 'Bác sĩ chuyên khoa',
          avatar: d.avatar,
          badge: d.rating ? `★ ${Number(d.rating).toFixed(1)}` : undefined,
          badgeColor: 'bg-slate-100 border border-slate-200',
          extra: d,
        }
      }),
    [slotDoctors, selectedSpecialtyObj?.name]
  )

  // 4. Handlers (Tuần tự: chọn bước trước sẽ reset các bước sau để đảm bảo dữ liệu nhất quán)
  const handleSelectSpecialty = (opt: SelectModalOption) => {
    if (String(opt.id) !== String(selectedSpecialtyId)) {
      setSelectedSpecialtyId(opt.id)
      setSelectedBranchId('')
      setSelectedServiceState(null)
      setSelectedDate('')
      setSelectedSlot('')
      setSelectedSlotId(undefined)
      setSelectedDoctor(null)
    }
    setModalType(null)
  }

  const handleSelectBranch = (opt: SelectModalOption) => {
    if (String(opt.id) !== selectedBranchId) {
      setSelectedBranchId(String(opt.id))
      setSelectedServiceState(null)
      setSelectedDate('')
      setSelectedSlot('')
      setSelectedSlotId(undefined)
      setSelectedDoctor(null)
    }
    setModalType(null)
  }

  const handleSelectService = (opt: SelectModalOption) => {
    setSelectedServiceState(opt.extra)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
    setSelectedDoctor(null)
    setModalType(null)
  }

  const handleSelectDate = (opt: SelectModalOption) => {
    setSelectedDate(String(opt.id))
    setSelectedSlot('')
    setSelectedSlotId(undefined)
    setSelectedDoctor(null)
    setModalType(null)
  }

  const handleSelectSlot = (opt: SelectModalOption) => {
    setSelectedSlot(opt.title)
    const slotDoctorsInOpt = opt.extra?.doctors || []
    if (slotDoctorsInOpt.length > 0) {
      const firstDoc = slotDoctorsInOpt[0]
      setSelectedSlotId(firstDoc.slotId || opt.extra?.id || String(opt.id))
      setSelectedDoctor({
        id: firstDoc.doctorId,
        fullName: firstDoc.doctorName,
        name: firstDoc.doctorName,
        title: firstDoc.academicRank || 'Bác sĩ',
        specialty: selectedSpecialtyObj?.name || 'Chuyên khoa',
        specialty_name: selectedSpecialtyObj?.name || 'Chuyên khoa',
        consultation_fee: selectedService?.price ? Number(selectedService.price) : firstDoc.consultationFee || 300000,
        price: selectedService?.price ? Number(selectedService.price) : firstDoc.consultationFee || 300000,
        rating: 4.9,
        experience_years: firstDoc.experienceYears || 0,
        avatar: resolveDoctorAvatarUrl(firstDoc.avatarUrl || undefined),
        roomId: firstDoc.roomId || undefined,
        roomName: firstDoc.roomName || undefined,
        slotId: firstDoc.slotId,
      } as any)
    } else {
      setSelectedSlotId(typeof opt.extra === 'object' && opt.extra?.id ? opt.extra.id : String(opt.id))
    }
    setModalType(null)
  }

  const handleSelectDoctor = (doc: Doctor) => {
    setSelectedDoctor(doc)
    if ((doc as any).slotId) {
      setSelectedSlotId((doc as any).slotId)
    }
    setModalType(null)
  }

  const handleClearSpecialty = () => {
    setSelectedSpecialtyId(undefined)
    setSelectedBranchId('')
    setSelectedServiceState(null)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
    setSelectedDoctor(null)
  }

  const handleClearBranch = () => {
    setSelectedBranchId('')
    setSelectedServiceState(null)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
    setSelectedDoctor(null)
  }

  const handleClearService = () => {
    setSelectedServiceState(null)
    setSelectedDate('')
    setSelectedSlot('')
    setSelectedSlotId(undefined)
    setSelectedDoctor(null)
  }

  const handleClearDoctor = () => {
    setSelectedDoctor(null)
    setSelectedSlot('')
    setSelectedSlotId(undefined)
  }

  const handleClearSlot = () => {
    setSelectedSlot('')
    setSelectedSlotId(undefined)
  }

  const isServiceValid = Boolean(selectedService &&
    specialtyServices.some((service: any) => String(service.id) === String(selectedService.id)))
  const isStage1Complete = Boolean(selectedSpecialtyId && selectedBranchId && isServiceValid)
  const isFormComplete = Boolean(
    selectedSpecialtyId &&
      selectedBranchId &&
      isServiceValid &&
      selectedDate &&
      selectedSlot &&
      selectedDoctor
  )

  const handleContinue = () => {
    if (!selectedSpecialtyId) {
      Alert.alert('Chưa chọn chuyên khoa', 'Vui lòng chọn chuyên khoa khám bệnh.')
      return
    }
    if (!selectedBranchId) {
      Alert.alert('Chưa chọn chi nhánh', 'Vui lòng chọn cơ sở phòng khám để tiếp tục.')
      return
    }
    if (!isServiceValid) {
      Alert.alert('Chưa chọn dịch vụ khám', 'Vui lòng chọn dịch vụ khám chuyên khoa.')
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
    if (!selectedDoctor) {
      Alert.alert('Chưa chọn bác sĩ', 'Vui lòng chọn bác sĩ phụ trách khám.')
      return
    }

    let slotId = selectedSlotId
    if (!slotId && (selectedDoctor as any)?.slotId) {
      slotId = (selectedDoctor as any).slotId
    }

    setBranchId(selectedBranchId)
    setDoctor(selectedDoctor)
    if (selectedSpecialtyObj) setSpecialty(selectedSpecialtyObj)
    if (selectedService) setSpecialtyService(selectedService)
    useBookingStore.getState().setBookingMethod('SPECIALTY_EXAM')
    setIsAfterHours(false)
    setDateTime(selectedDate, selectedSlot, slotId)

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.()
    }
    router.push('/booking/patient-info')
  }

  return {
    tomorrow,
    selectedSpecialtyId,
    selectedSpecialtyObj,
    selectedBranchId,
    selectedBranchObj,
    selectedService,
    specialtyServices,
    selectedDoctor,
    selectedDate,
    selectedSlot,
    selectedSlotId,
    slotDoctors,
    isStage1Complete,
    isFormComplete,

    // Loading
    loadingSpecialties,
    loadingBranches,
    loadingServices,
    loadingSlots,

    // Modal
    modalType,
    setModalType,

    // Options
    specialtyOptions,
    branchOptions,
    serviceOptions,
    doctorOptions,
    dateOptions,
    slotOptions,

    // Actions
    handleSelectSpecialty,
    handleSelectBranch,
    handleSelectService,
    handleSelectDate,
    handleSelectSlot,
    handleSelectDoctor,
    handleClearSpecialty,
    handleClearBranch,
    handleClearService,
    handleClearDoctor,
    handleClearSlot,
    handleContinue,
  }
}
