import React, { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { useBookingStore } from '../../src/store/useBookingStore'
import { doctorService } from '../../src/services/doctorService'
import { getTomorrowDateString, formatDateVi, formatCurrencyVi } from '../../src/utils/date'
import { Doctor } from '../../src/types/doctor'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { SelectInput } from '../../src/components/common/SelectInput'
import { SelectModal, SelectModalOption } from '../../src/components/common/SelectModal'
import { Button } from '../../src/components/common/Button'
import { BookingTimeline } from '../../src/components/booking/BookingTimeline'

type BookingMethod = 'SPECIALTY_EXAM' | 'CONSULTATION' | 'HEALTH_PACKAGE' | 'AFTER_HOURS'

export default function UnifiedBookingScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    method?: string
    mode?: string
    doctorId?: string
    packageId?: string
    specialtyId?: string
    branchId?: string
  }>()

  // 1. Initial State from Params or Store
  const {
    draft,
    setBranchId,
    setDoctor,
    setHealthPackage,
    setSpecialty,
    setDateTime,
    setIsAfterHours,
  } = useBookingStore()

  const initialMethod: BookingMethod =
    params.mode === 'after-hours'
      ? 'AFTER_HOURS'
      : params.method === 'package' || params.packageId
        ? 'HEALTH_PACKAGE'
        : params.method === 'doctor' || params.doctorId
          ? 'CONSULTATION'
          : params.method === 'specialty'
            ? 'SPECIALTY_EXAM'
            : (draft.bookingMethod as BookingMethod) || 'SPECIALTY_EXAM'

  const [method, setMethod] = useState<BookingMethod>(initialMethod)

  // Form selections
  const [selectedBranchId, setSelectedBranchId] = useState<string>(params.branchId || draft.branchId || '')
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string | number | undefined>(
    params.specialtyId || draft.specialty?.id
  )
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(draft.doctor || null)
  const [selectedPackage, setSelectedPackage] = useState<any | null>(draft.healthPackage || null)

  const tomorrow = getTomorrowDateString()
  const initialDate =
    (draft.doctor || draft.healthPackage) && draft.date && draft.date >= tomorrow ? draft.date : ''
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedSlot, setSelectedSlot] = useState<string>(draft.slot || '')
  const [selectedSlotId, setSelectedSlotId] = useState<string | undefined>(draft.slotId)

  // Top-down validation checks
  const hasBranch = Boolean(selectedBranchId)
  const hasSpecialty = Boolean(selectedSpecialtyId)
  const hasDoctor = Boolean(selectedDoctor)
  const hasDoctorOrPackage =
    method === 'HEALTH_PACKAGE' ? Boolean(selectedPackage) : (hasSpecialty && hasDoctor)
  const hasDate = Boolean(selectedDate)
  const hasSlot = Boolean(selectedSlot)
  const isFormComplete = hasBranch && hasDoctorOrPackage && hasDate && hasSlot

  // Modal visibility states
  const [modalType, setModalType] = useState<
    'branch' | 'specialty' | 'doctor' | 'package' | 'date' | 'slot' | null
  >(null)

  // 2. Data Queries
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
    queryFn: () => doctorService.getBranches(),
  })

  // Auto-select first branch if none selected
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
    queryKey: ['doctors', selectedBranchId, selectedSpecialtyId],
    queryFn: () => doctorService.getDoctors(selectedBranchId, selectedSpecialtyId as any),
    enabled: Boolean(selectedBranchId && (selectedSpecialtyId || params.doctorId)),
  })

  const { data: packages = [], isLoading: loadingPackages } = useQuery({
    queryKey: ['healthPackages', selectedBranchId],
    queryFn: () => doctorService.getHealthPackages(selectedBranchId),
    enabled: method === 'HEALTH_PACKAGE',
  })

  // Pre-select doctor if doctorId param passed
  useEffect(() => {
    if (params.doctorId && doctors.length > 0) {
      const found = doctors.find((d) => String(d.id) === String(params.doctorId))
      if (found) {
        setSelectedDoctor(found)
        if ((found as any).branchId) setSelectedBranchId((found as any).branchId)
        const specId = (found as any).specialtyId || (found as any).specialty?.id
        if (specId) setSelectedSpecialtyId(specId)
      }
    }
  }, [params.doctorId, doctors])

  // Pre-select package if packageId param passed
  useEffect(() => {
    if (params.packageId && packages.length > 0) {
      const found = packages.find((p) => String(p.id) === String(params.packageId))
      if (found) {
        setSelectedPackage(found)
      }
    }
  }, [params.packageId, packages])

  // Available Dates query
  const { data: doctorAvailableDates = [] } = useQuery({
    queryKey: ['doctorDates', selectedDoctor?.id, selectedBranchId],
    queryFn: () => doctorService.getDoctorAvailableDates(String(selectedDoctor!.id), selectedBranchId),
    enabled: Boolean(selectedDoctor?.id),
  })

  const { data: packageAvailableDates = [] } = useQuery({
    queryKey: ['packageDates', selectedPackage?.id, selectedBranchId],
    queryFn: () => doctorService.getPackageScheduleDates(String(selectedPackage!.id), selectedBranchId),
    enabled: Boolean(selectedPackage?.id) && method === 'HEALTH_PACKAGE',
  })

  const availableDatesList = useMemo(() => {
    if (method === 'HEALTH_PACKAGE' && packageAvailableDates.length > 0) {
      return packageAvailableDates
    }
    if (selectedDoctor && doctorAvailableDates.length > 0) {
      return doctorAvailableDates
    }

    // Fallback: Generate next 14 days
    const dates: string[] = []
    const base = new Date()
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000)
      const yyyy = d.getFullYear()
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      dates.push(`${yyyy}-${mm}-${dd}`)
    }
    return dates
  }, [method, selectedDoctor, doctorAvailableDates, packageAvailableDates])

  // Available Slots query
  const { data: doctorSlots = [], isLoading: loadingDoctorSlots } = useQuery({
    queryKey: ['doctorSlots', selectedDoctor?.id, selectedDate, selectedBranchId],
    queryFn: () => doctorService.getAvailability(selectedDoctor!.id, selectedDate, selectedBranchId),
    enabled: Boolean(selectedDoctor?.id && selectedDate),
  })

  const { data: packageSlots = [], isLoading: loadingPackageSlots } = useQuery({
    queryKey: ['packageSlots', selectedPackage?.id, selectedDate, selectedBranchId],
    queryFn: () => doctorService.getPackageTimeslots(String(selectedPackage?.id), selectedDate, selectedBranchId),
    enabled: Boolean(selectedPackage?.id && selectedDate && method === 'HEALTH_PACKAGE'),
  })

  // Format slots list
  const availableSlotsList = useMemo<any[]>(() => {
    let rawList: any[] = []
    if (method === 'HEALTH_PACKAGE') {
      rawList = packageSlots.length > 0 ? packageSlots : []
    } else {
      rawList = doctorSlots.length > 0 ? doctorSlots : []
    }

    if (rawList.length === 0) {
      // Default slots fallback
      const defaults = [
        { startTime: '08:00', endTime: '08:30' },
        { startTime: '08:30', endTime: '09:00' },
        { startTime: '09:00', endTime: '09:30' },
        { startTime: '09:30', endTime: '10:00' },
        { startTime: '10:00', endTime: '10:30' },
        { startTime: '10:30', endTime: '11:00' },
        { startTime: '11:00', endTime: '11:30' },
        { startTime: '13:30', endTime: '14:00' },
        { startTime: '14:00', endTime: '14:30' },
        { startTime: '14:30', endTime: '15:00' },
        { startTime: '15:00', endTime: '15:30' },
        { startTime: '15:30', endTime: '16:00' },
        { startTime: '16:00', endTime: '16:30' },
        { startTime: '16:30', endTime: '17:00' },
        { startTime: '17:30', endTime: '18:00' },
        { startTime: '18:00', endTime: '18:30' },
        { startTime: '18:30', endTime: '19:00' },
        { startTime: '19:00', endTime: '19:30' },
        { startTime: '19:30', endTime: '20:00' },
        { startTime: '20:00', endTime: '20:30' },
      ]
      rawList = defaults.map((item, idx) => ({
        id: `default-slot-${idx}`,
        startTime: item.startTime,
        endTime: item.endTime,
        isAvailable: true,
      }))
    }

    if (method === 'AFTER_HOURS') {
      return rawList.filter((s: any) => {
        const timeStr = typeof s === 'string' ? s : s.startTime
        if (!timeStr) return false
        const hour = parseInt(timeStr.slice(0, 2), 10)
        const min = parseInt(timeStr.slice(3, 5), 10)
        return hour > 17 || (hour === 17 && min >= 30)
      })
    }

    return rawList
  }, [method, packageSlots, doctorSlots])

  // Current selections labels
  const selectedBranchObj = branches.find((b: any) => String(b.id) === String(selectedBranchId))
  const selectedSpecialtyObj = specialties.find((s) => String(s.id) === String(selectedSpecialtyId))

  // Handle Continue to Screen 2
  const handleContinue = () => {
    if (!selectedBranchId) {
      Alert.alert('Chưa chọn chi nhánh', 'Vui lòng chọn cơ sở phòng khám để tiếp tục.')
      return
    }

    if (method === 'HEALTH_PACKAGE' && !selectedPackage) {
      Alert.alert('Chưa chọn gói khám', 'Vui lòng chọn một gói khám sức khỏe phù hợp.')
      return
    }

    if (method !== 'HEALTH_PACKAGE' && !selectedSpecialtyId) {
      Alert.alert('Chưa chọn chuyên khoa', 'Vui lòng chọn một chuyên khoa cụ thể.')
      return
    }

    if (method !== 'HEALTH_PACKAGE' && !selectedDoctor) {
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

    // 1. Resolve Slot ID
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

    // 2. Save selections to store
    if (selectedBranchId) setBranchId(selectedBranchId)
    if (selectedDoctor) setDoctor(selectedDoctor)
    if (selectedPackage) setHealthPackage(selectedPackage)
    if (selectedSpecialtyObj) setSpecialty(selectedSpecialtyObj)
    setIsAfterHours(method === 'AFTER_HOURS')
    setDateTime(selectedDate, selectedSlot, slotId)

    // 3. Navigate to Screen 2 (patient-info)
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.()
    }
    router.push('/booking/patient-info')
  }

  // Options converters for SelectModals
  const branchOptions: SelectModalOption[] = branches.map((b: any) => ({
    id: b.id,
    title: b.name,
    subtitle: b.address,
    badge: b.isMainBranch ? 'Trụ sở chính' : undefined,
  }))

  const specialtyOptions: SelectModalOption[] = specialties.map((s, idx) => ({
    id: String(s.id ?? `spec-${idx}`),
    title: s.name,
    subtitle: (s as any).description || 'Chuyên khoa mũi nhọn tại VitaCare',
  }))

  const doctorOptions: SelectModalOption[] = doctors.map((d) => {
    const docName = d.full_name || d.fullName || d.name || 'Bác sĩ'
    const docTitle = d.title || (d as any).academicRank || 'Bác sĩ'
    const docSpecialty = d.specialty_name || (typeof d.specialty === 'object' ? d.specialty?.name : d.specialty) || 'Đa khoa'
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
  })

  const packageOptions: SelectModalOption[] = packages.map((p: any) => ({
    id: p.id,
    title: p.name,
    subtitle: `${p.category || 'Gói khám'} • Giá trọn gói: ${formatCurrencyVi(Number(p.price || 1200000))}`,
    badge: p.isPopular ? 'Phổ biến' : undefined,
    extra: p,
  }))

  const dateOptions: SelectModalOption[] = availableDatesList.map((dStr) => {
    return {
      id: dStr,
      title: formatDateVi(dStr),
      subtitle: dStr === tomorrow ? 'Ngày mai (Sớm nhất)' : `Lịch khám ngày ${dStr}`,
      badge: dStr === tomorrow ? 'Khuyên chọn' : undefined,
    }
  })

  const slotOptions: SelectModalOption[] = availableSlotsList.map((s: any, idx: number) => {
    const startStr = (typeof s === 'string' ? s : s.startTime || '').trim().slice(0, 5)
    let endStr = typeof s === 'object' && s.endTime ? String(s.endTime).trim().slice(0, 5) : ''
    if (!endStr || endStr === startStr) {
      const parts = startStr.split(':')
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10)
        const m = parseInt(parts[1], 10)
        const total = h * 60 + m + 30
        const endH = Math.floor(total / 60) % 24
        const endM = total % 60
        endStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
      }
    }
    const timeRange = endStr ? `${startStr} - ${endStr}` : startStr

    const hour = parseInt(startStr.slice(0, 2), 10)
    const isEvening = hour >= 17
    const isAfternoon = hour >= 12 && hour < 17
    const periodLabel = isEvening ? 'Ngoài giờ (Tối)' : isAfternoon ? 'Ca chiều' : 'Ca sáng'
    const isAvail = typeof s === 'string' ? true : s.isAvailable !== false
    const slotId = typeof s === 'object' && s.id ? String(s.id) : `slot-${idx}`

    return {
      id: slotId,
      title: timeRange,
      subtitle: `${periodLabel} • ${isAvail ? 'Khung giờ còn trống' : 'Đã kín chỗ'}`,
      badge: periodLabel,
      badgeColor: isEvening ? 'bg-amber-100' : isAfternoon ? 'bg-sky-100' : 'bg-emerald-100',
      disabled: !isAvail,
      extra: {
        ...(typeof s === 'object' ? s : {}),
        id: slotId,
        startTime: startStr,
        endTime: endStr,
        timeRange,
      },
    }
  })

  return (
    <ScreenShell showBackButton title="Đặt lịch khám bệnh">
      <BookingTimeline currentStep={1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 100 }}
        >
          {/* 1. Section: Cơ sở & Dịch vụ khám */}
          <View className="mb-7">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5">
              1. Cơ sở & Dịch vụ khám
            </Text>

            {/* Select Chi nhánh */}
            <SelectInput
              label="Chi nhánh tiếp đón"
              required
              placeholder="Chọn chi nhánh phòng khám..."
              value={selectedBranchObj?.name}
              sublabel={selectedBranchObj?.address}
              leftIcon="business-outline"
              loading={loadingBranches}
              onPress={() => setModalType('branch')}
            />

            {/* If NOT package: Select Specialty & Doctor */}
            {method !== 'HEALTH_PACKAGE' ? (
              <>
                {/* Select Chuyên khoa */}
                <SelectInput
                  label="Chuyên khoa khám"
                  required
                  disabled={!hasBranch}
                  placeholder={!hasBranch ? 'Chọn chi nhánh trước...' : 'Chọn huyên khoa'}
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
                  onPress={() => setModalType('specialty')}
                  onClear={
                    selectedSpecialtyId
                      ? () => {
                        setSelectedSpecialtyId(undefined)
                        setSelectedDoctor(null)
                        setSelectedDate('')
                        setSelectedSlot('')
                        setSelectedSlotId(undefined)
                      }
                      : undefined
                  }
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
                  value={
                    selectedDoctor
                      ? `${selectedDoctor.title ? `${selectedDoctor.title} ` : ''}${selectedDoctor.full_name || selectedDoctor.fullName || selectedDoctor.name
                      }`
                      : undefined
                  }
                  sublabel={
                    selectedDoctor
                      ? `${selectedDoctor.specialty_name || selectedSpecialtyObj?.name || 'Chuyên khoa'} • Phí khám: ${formatCurrencyVi(
                        Number(selectedDoctor.price || selectedDoctor.consultation_fee || 300000)
                      )}`
                      : !hasSpecialty
                        ? 'Cần chọn chuyên khoa trước khi chọn bác sĩ'
                        : undefined
                  }
                  leftIcon="person-outline"
                  loading={loadingDoctors}
                  onPress={() => setModalType('doctor')}
                  onClear={
                    selectedDoctor
                      ? () => {
                        setSelectedDoctor(null)
                        setSelectedDate('')
                        setSelectedSlot('')
                        setSelectedSlotId(undefined)
                      }
                      : undefined
                  }
                />
              </>
            ) : (
              /* If PACKAGE: Select Health Package */
              <SelectInput
                label="Gói khám sức khỏe"
                required
                disabled={!hasBranch}
                placeholder={!hasBranch ? 'Vui lòng chọn chi nhánh trước' : 'Chọn gói khám định kỳ'}
                value={selectedPackage?.name}
                sublabel={
                  selectedPackage
                    ? `Giá trọn gói: ${formatCurrencyVi(Number(selectedPackage.price || 1200000))}`
                    : undefined
                }
                leftIcon="shield-checkmark-outline"
                loading={loadingPackages}
                onPress={() => setModalType('package')}
                onClear={
                  selectedPackage
                    ? () => {
                      setSelectedPackage(null)
                      setSelectedDate('')
                      setSelectedSlot('')
                      setSelectedSlotId(undefined)
                    }
                    : undefined
                }
              />
            )}
          </View>

          {/* 2. Section: Thời gian khám */}
          <View className="mb-8">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5">
              2. Thời gian khám
            </Text>

            {/* Select Ngày khám */}
            <SelectInput
              label="Ngày khám dự kiến"
              required
              disabled={!hasDoctorOrPackage}
              placeholder={
                !hasDoctorOrPackage
                  ? method === 'HEALTH_PACKAGE'
                    ? 'Vui lòng chọn gói khám trước...'
                    : 'Vui lòng chọn bác sĩ trước...'
                  : 'Chọn ngày khám...'
              }
              value={hasDoctorOrPackage && selectedDate ? formatDateVi(selectedDate) : undefined}
              sublabel={hasDoctorOrPackage && selectedDate === tomorrow ? 'Ngày mai (Sớm nhất)' : undefined}
              leftIcon="calendar-outline"
              onPress={() => setModalType('date')}
            />

            {/* Select Khung giờ khám */}
            <SelectInput
              label="Khung giờ tiếp đón"
              required
              disabled={!hasDate || !hasDoctorOrPackage}
              placeholder={
                !hasDoctorOrPackage
                  ? method === 'HEALTH_PACKAGE'
                    ? 'Vui lòng chọn gói khám trước...'
                    : 'Vui lòng chọn bác sĩ trước...'
                  : !hasDate
                    ? 'Vui lòng chọn ngày khám trước...'
                    : 'Chọn ca/giờ khám...'
              }
              value={
                hasDate && hasDoctorOrPackage && selectedSlot
                  ? `${selectedSlot} (${method === 'AFTER_HOURS' ? 'Ngoài giờ' : 'Ca khám'})`
                  : undefined
              }
              sublabel={hasDate && hasDoctorOrPackage && selectedSlot ? 'Thời gian có mặt trước 10 phút' : undefined}
              leftIcon="time-outline"
              loading={loadingDoctorSlots || loadingPackageSlots}
              onPress={() => setModalType('slot')}
              onClear={
                selectedSlot
                  ? () => {
                      setSelectedSlot('')
                      setSelectedSlotId(undefined)
                    }
                  : undefined
              }
            />
          </View>
        </ScrollView>

        {/* Bottom Continue Button */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3">
          <Button
            title="Tiếp tục"
            onPress={handleContinue}
            disabled={!isFormComplete}
            className="py-3 rounded-lg w-full"
          />
        </View>

        {/* ================= MODAL PICKERS ================= */}
        {/* Modal: Chi nhánh */}
        <SelectModal
          visible={modalType === 'branch'}
          onClose={() => setModalType(null)}
          title="Chọn chi nhánh tiếp đón"
          subtitle="Hệ thống đa chi nhánh VitaCare Clinic"
          searchPlaceholder="Tìm kiếm chi nhánh, quận..."
          options={branchOptions}
          selectedId={selectedBranchId}
          onSelect={(opt) => {
            if (String(opt.id) !== selectedBranchId) {
              setSelectedBranchId(String(opt.id))
              setSelectedSpecialtyId(undefined)
              setSelectedDoctor(null)
              setSelectedPackage(null)
              setSelectedDate('')
              setSelectedSlot('')
              setSelectedSlotId(undefined)
            }
          }}
        />

        {/* Modal: Chuyên khoa */}
        <SelectModal
          visible={modalType === 'specialty'}
          onClose={() => setModalType(null)}
          title="Chọn chuyên khoa khám"
          subtitle="Bắt buộc chọn 1 chuyên khoa cụ thể để tiếp tục"
          searchPlaceholder="Tìm kiếm tên chuyên khoa..."
          options={specialtyOptions}
          selectedId={selectedSpecialtyId ? String(selectedSpecialtyId) : undefined}
          onSelect={(opt) => {
            setSelectedSpecialtyId(opt.id)
            setSelectedDoctor(null)
            setSelectedDate('')
            setSelectedSlot('')
            setSelectedSlotId(undefined)
          }}
        />

        {/* Modal: Bác sĩ */}
        <SelectModal
          visible={modalType === 'doctor'}
          onClose={() => setModalType(null)}
          title="Chọn bác sĩ điều trị"
          subtitle={
            selectedSpecialtyObj
              ? `Chuyên khoa: ${selectedSpecialtyObj.name}`
              : 'Đội ngũ bác sĩ chuyên khoa VitaCare'
          }
          searchPlaceholder="Tìm kiếm theo tên bác sĩ, học vị..."
          options={doctorOptions}
          selectedId={selectedDoctor?.id}
          loading={loadingDoctors}
          emptyText="Không có bác sĩ khả dụng cho chuyên khoa này tại cơ sở đã chọn"
          onSelect={(opt) => {
            setSelectedDoctor(opt.extra)
            setSelectedDate('')
            setSelectedSlot('')
            setSelectedSlotId(undefined)
          }}
        />

        {/* Modal: Gói khám */}
        <SelectModal
          visible={modalType === 'package'}
          onClose={() => setModalType(null)}
          title="Chọn gói khám sức khỏe"
          subtitle="Tầm soát và khám tổng quát định kỳ"
          searchPlaceholder="Tìm kiếm gói khám..."
          options={packageOptions}
          selectedId={selectedPackage?.id}
          loading={loadingPackages}
          onSelect={(opt) => {
            setSelectedPackage(opt.extra)
            setSelectedDate('')
            setSelectedSlot('')
            setSelectedSlotId(undefined)
          }}
        />

        {/* Modal: Ngày khám */}
        <SelectModal
          visible={modalType === 'date'}
          onClose={() => setModalType(null)}
          title="Chọn ngày khám bệnh"
          subtitle="Các ngày làm việc khả dụng trong hệ thống"
          options={dateOptions}
          selectedId={selectedDate}
          onSelect={(opt) => {
            setSelectedDate(String(opt.id))
            setSelectedSlot('')
            setSelectedSlotId(undefined)
          }}
        />

        {/* Modal: Khung giờ */}
        <SelectModal
          visible={modalType === 'slot'}
          onClose={() => setModalType(null)}
          title="Chọn khung giờ tiếp đón"
          subtitle={`Ngày ${formatDateVi(selectedDate)} • Vui lòng đến trước 10 phút`}
          options={slotOptions}
          selectedId={
            selectedSlotId ||
            (selectedSlot
              ? slotOptions.find((o) => o.title === selectedSlot || o.title.startsWith(selectedSlot.slice(0, 5)))?.id
              : undefined)
          }
          loading={loadingDoctorSlots || loadingPackageSlots}
          emptyText="Không còn ca khám trống trong ngày này. Vui lòng chọn ngày khác."
          onSelect={(opt) => {
            const timeRange = opt.title
            setSelectedSlot(timeRange)
            if (typeof opt.extra === 'object' && opt.extra?.id) {
              setSelectedSlotId(opt.extra.id)
            } else {
              setSelectedSlotId(String(opt.id))
            }
          }}
        />
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
