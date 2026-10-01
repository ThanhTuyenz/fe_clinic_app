import { useEffect, useMemo, useState } from 'react'
import { Alert, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'

import { useBookingStore } from '../../store/useBookingStore'
import { doctorService } from '../../services/doctorService'
import { Doctor } from '../../types/doctor'
import { extractDoctorSpecialtyId } from '../../constants/bookingSlots'

export function useDoctorBooking() {
  const router = useRouter()
  const params = useLocalSearchParams<{ doctorId?: string; branchId?: string }>()
  const { draft, setBranchId, setDoctor, setSpecialty } = useBookingStore()

  // 1. State
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(draft.doctor || null)
  const [doctorSearch, setDoctorSearch] = useState('')

  // 2. Data Queries
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => doctorService.getBranches(),
  })

  // Lấy tất cả bác sĩ toàn hệ thống
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors', 'all-doctors'],
    queryFn: () => doctorService.getDoctors(),
  })

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
    if (selectedDoctor?.branchId) return selectedDoctor.branchId
    if (params.branchId) return params.branchId
    if (draft.branchId) return draft.branchId
    const defaultBranch = branches.find((b: any) => b.code === 'VC-CENTRAL') || branches[0]
    return defaultBranch?.id || ''
  }, [selectedDoctor, params.branchId, draft.branchId, branches])

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
      Alert.alert('Chưa chọn bác sĩ', 'Vui lòng chọn bác sĩ khám bệnh.')
      return
    }

    setBranchId(effectiveBranchId)
    setDoctor(selectedDoctor)
    const specId = extractDoctorSpecialtyId(selectedDoctor) || 1
    setSpecialty({
      id: specId,
      name:
        selectedDoctor.specialty_name ||
        (typeof selectedDoctor.specialty === 'string' ? selectedDoctor.specialty : 'Chuyên khoa'),
    })
    useBookingStore.getState().setBookingMethod('CONSULTATION')

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur?.()
    }

    // Điều hướng sang Screen 2: Chọn thời gian khám với bác sĩ đã chọn
    router.push('/booking/doctor/time')
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
