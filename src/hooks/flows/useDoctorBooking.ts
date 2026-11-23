import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { useBookingStore } from '../../store/useBookingStore'
import { bookingService } from '../../services/bookingService'
import { Doctor } from '../../types/doctor'
import { extractDoctorSpecialtyId } from '../../constants/bookingSlots'

export function useDoctorBooking(flow: 'doctor' | 'online' = 'doctor') {
  const router = useRouter()
  const params = useLocalSearchParams<{ doctorId?: string; branchId?: string; date?: string; time?: string; slotId?: string }>()
  const { draft, setBranchId, setDoctor, setSpecialty, setDateTime } = useBookingStore()
  const bookingMethod = flow === 'online' ? 'ONLINE_CONSULTATION' : 'CONSULTATION'

  // 1. State
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(
    flow === 'online' && draft.bookingMethod !== bookingMethod ? null : draft.doctor || null
  )
  const [doctorSearch, setDoctorSearch] = useState('')

  // 2. Data Queries
  const { data: bookingInit, isLoading: loadingInit } = useQuery({
    queryKey: ['booking', 'init', flow],
    queryFn: () => bookingService.getBookingInit({ flow }),
    staleTime: 5 * 60 * 1000,
  })
  const branches = bookingInit?.branches || []

  // Lấy tất cả bác sĩ toàn hệ thống
  const doctors = bookingInit?.doctors || []
  const loadingDoctors = loadingInit

  // Pre-select doctor if doctorId param passed
  useEffect(() => {
    if (params.doctorId && doctors.length > 0) {
      const found = doctors.find((d) => String(d.id) === String(params.doctorId))
      if (found) {
        setSelectedDoctor(found)
      }
    }
  }, [params.doctorId, doctors])

  // Tự động xác định chi nhánh theo bác sĩ đã chọn
  const effectiveBranchId = useMemo(() => {
    if (params.branchId && branches.some((branch: { id: string }) => branch.id === params.branchId)) return params.branchId
    if (flow === 'online' && selectedDoctor?.branchId) return selectedDoctor.branchId
    if (params.branchId) return params.branchId
    if (selectedDoctor?.branchId) return selectedDoctor.branchId
    if (draft.branchId) return draft.branchId
    const defaultBranch = branches.find((b: any) => b.code === 'VC-CENTRAL') || branches[0]
    return defaultBranch?.id || ''
  }, [flow, selectedDoctor, params.branchId, draft.branchId, branches])

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

  // 4. Handlers
  const handleSelectDoctor = (doc: Doctor) => {
    setSelectedDoctor(doc)
  }

  const handleContinue = () => {
    if (!selectedDoctor) {
      Alert.alert('Chưa chọn bác sĩ', flow === 'online' ? 'Vui lòng chọn bác sĩ tư vấn online.' : 'Vui lòng chọn bác sĩ khám bệnh.')
      return
    }

    if (!effectiveBranchId) {
      Alert.alert('Chưa có cơ sở', 'Chưa xác định được cơ sở của bác sĩ. Vui lòng thử lại.')
      return
    }

    if (String(draft.doctor?.id) !== String(selectedDoctor.id) || draft.branchId !== effectiveBranchId || draft.bookingMethod !== bookingMethod) {
      setDateTime('', '', undefined)
    }

    setBranchId(effectiveBranchId)
    setDoctor({ ...selectedDoctor, branchId: effectiveBranchId })
    const specId = extractDoctorSpecialtyId(selectedDoctor) || 1
    setSpecialty({
      id: specId,
      name:
        selectedDoctor.specialty_name ||
        (typeof selectedDoctor.specialty === 'string' ? selectedDoctor.specialty : 'Chuyên khoa'),
    })
    useBookingStore.getState().setBookingMethod(bookingMethod)

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.()
    }

    // Điều hướng sang Screen 2: Chọn thời gian khám với bác sĩ đã chọn
    router.push({ pathname: flow === 'online' ? '/booking/online/time' : '/booking/doctor/time',
      params: { date: params.date || '', time: params.time || '', slotId: params.slotId || '' } })
  }

  return {
    selectedDoctor,
    doctorSearch,
    setDoctorSearch,
    doctors,
    displayedDoctors,
    loadingDoctors,
    handleSelectDoctor,
    handleContinue,
  }
}
