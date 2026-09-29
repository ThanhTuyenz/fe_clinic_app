import React, { useState, useMemo, useEffect } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'

import { useBookingStore } from '../../src/store/useBookingStore'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useCreateAppointment } from '../../src/hooks/useBooking'
import { useNotifications } from '../../src/hooks/useNotifications'
import { patientProfileService, PatientProfile } from '../../src/services/patientProfileService'
import { doctorService } from '../../src/services/doctorService'
import { formatDateVi, formatCurrencyVi } from '../../src/utils/date'
import { ScreenShell, Button } from '../../src/components/common'
import { CreateProfileModal } from '../../src/components/profile'
import { BookingTimeline } from '../../src/components/booking'

export default function PatientInfoScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { draft, resetBooking, setSelectedProfile, setPatientProfileId } = useBookingStore()
  const { scheduleAppointmentReminder } = useNotifications()
  const createAppointmentMutation = useCreateAppointment()

  const [submitting, setSubmitting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('self')

  // Patient profiles query
  const { data: patientProfiles = [], refetch } = useQuery({
    queryKey: ['patientProfiles'],
    queryFn: () => patientProfileService.getPatientProfiles(),
    enabled: isAuthenticated,
  })

  // Build unified profile cards list
  const profileList = useMemo<PatientProfile[]>(() => {
    if (patientProfiles.length > 0) {
      const hasSelf = patientProfiles.some(
        (p) => p.isMainProfile || p.relationshipToAccount === 'SELF'
      )
      if (hasSelf) {
        return patientProfiles
      }
      return [
        {
          id: 'self',
          fullName: user?.full_name || user?.fullName || 'Hồ sơ chính (Bản thân)',
          phoneNumber: user?.phone || '',
          dateOfBirth: user?.date_of_birth || user?.dateOfBirth || '',
          gender: (user?.gender?.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE') as any,
          address: user?.address || '',
          relationshipToAccount: 'SELF',
          isMainProfile: true,
        } as PatientProfile,
        ...patientProfiles,
      ]
    }

    return [
      {
        id: 'self',
        fullName: user?.full_name || user?.fullName || 'Hồ sơ chính (Bản thân)',
        phoneNumber: user?.phone || '',
        dateOfBirth: user?.date_of_birth || user?.dateOfBirth || '',
        gender: (user?.gender?.toUpperCase() === 'FEMALE' ? 'FEMALE' : 'MALE') as any,
        address: user?.address || '',
        relationshipToAccount: 'SELF',
        isMainProfile: true,
      } as PatientProfile,
    ]
  }, [patientProfiles, user])

  // Auto-select first profile if none chosen
  useEffect(() => {
    if (profileList.length > 0) {
      const exists = profileList.some((p) => String(p.id) === String(selectedProfileId))
      if (!exists) {
        setSelectedProfileId(String(profileList[0].id))
      }
    }
  }, [profileList, selectedProfileId])

  const isPackage = draft.bookingMethod === 'HEALTH_PACKAGE' || Boolean(draft.healthPackage)
  const serviceName = isPackage
    ? draft.healthPackage?.name || 'Gói khám sức khỏe'
    : draft.doctor?.full_name || draft.doctor?.fullName || draft.doctor?.name || 'Bác sĩ chuyên khoa'

  const doctorSpecialty =
    typeof draft.doctor?.specialty === 'object'
      ? draft.doctor?.specialty?.name
      : draft.doctor?.specialty || draft.doctor?.specialty_name || draft.specialty?.name || 'Đa khoa'

  const price = isPackage
    ? Number(draft.healthPackage?.price ?? 1200000)
    : Number(draft.doctor?.price || draft.doctor?.consultation_fee || 300000)

  // Relationship badge mapping
  const getRelationshipBadge = (rel?: string) => {
    switch (rel) {
      case 'SELF':
        return { label: 'Bản thân', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
      case 'SPOUSE':
        return { label: 'Vợ/Chồng', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      case 'CHILD':
        return { label: 'Con ruột', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'PARENT':
        return { label: 'Bố/Mẹ', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      default:
        return { label: 'Người thân', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  // Format Date of Birth (YYYY-MM-DD -> DD/MM/YYYY)
  const formatDob = (dob?: string | Date) => {
    if (!dob) return ''
    const str = typeof dob === 'string' ? dob : dob.toISOString()
    const datePart = str.split('T')[0]
    const parts = datePart.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return datePart
  }

  // Handle callback after creating a new profile
  const handleProfileCreated = (newProf: PatientProfile) => {
    refetch()
    setSelectedProfileId(String(newProf.id))
  }

  // Handle Continue to Confirm & Voucher screen
  const handleConfirm = async () => {
    const hasService = Boolean(draft.doctor?.id || draft.healthPackage?.id)
    if (!hasService || !draft.date || !draft.slot) {
      Alert.alert('Thiếu thông tin lịch khám', 'Vui lòng quay lại bước 1 để chọn dịch vụ và thời gian khám.')
      router.replace('/booking')
      return
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Quý khách vui lòng đăng nhập để lưu trữ phiếu hẹn và nhận kết quả khám.',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
        ]
      )
      return
    }

    try {
      setSubmitting(true)

      let resolvedProfile: PatientProfile | undefined = profileList.find(
        (p) => String(p.id) === String(selectedProfileId)
      )

      if (selectedProfileId === 'self') {
        const mainProfile = await patientProfileService.getOrCreateMainProfile({
          fullName: user?.full_name || user?.fullName || 'Bệnh nhân',
          phone: user?.phone,
          date_of_birth: user?.date_of_birth,
          gender: user?.gender,
        })
        resolvedProfile = mainProfile
      }

      if (!resolvedProfile) {
        throw new Error('Chưa chọn hồ sơ người khám bệnh.')
      }

      // Resolve Slot ID if missing
      let slotId = draft.slotId
      if (!slotId) {
        if (draft.doctor?.id) {
          const slots = await doctorService.getAvailability(draft.doctor.id, draft.date, draft.branchId)
          const target = slots.find((s) => s.startTime?.slice(0, 5) === draft.slot.slice(0, 5))
          slotId = target?.id
        } else if (draft.healthPackage?.id) {
          const slots = await doctorService.getPackageTimeslots(draft.healthPackage.id, draft.date, draft.branchId)
          const target = slots.find((s) => s.startTime?.slice(0, 5) === draft.slot.slice(0, 5))
          slotId = target?.id
        }
      }

      // Save to booking store
      setSelectedProfile(resolvedProfile)
      setPatientProfileId(String(resolvedProfile.id))
      if (slotId) {
        useBookingStore.setState((state) => ({
          draft: { ...state.draft, slotId },
        }))
      }

      // Navigate to Screen 3: Xác nhận thông tin và voucher
      router.push('/booking/confirm')
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể chọn hồ sơ bệnh nhân.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ScreenShell showBackButton title="Thông tin người khám">
      <BookingTimeline currentStep={2} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 }}
        >
          {/* Summary Card */}
          <View className="mb-5 bg-white border border-slate-200/90 rounded-lg p-3.5 shadow-2xs">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-2xs font-bold text-slate-400 uppercase tracking-wider">
                {isPackage ? 'Gói khám đã chọn' : 'Bác sĩ điều trị'}
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/booking')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-xs font-semibold text-emerald-700">Đổi lịch</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-sm font-bold text-slate-900 leading-snug">
              {serviceName}
            </Text>
            {!isPackage && (
              <Text className="text-xs text-slate-500 mt-0.5">
                Chuyên khoa: {doctorSpecialty}
              </Text>
            )}

            <View className="flex-row items-center mt-2 pt-2 border-t border-slate-200/60">
              <Ionicons name="calendar-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text className="text-xs font-semibold text-slate-700 mr-3">
                {draft.date ? formatDateVi(draft.date) : 'Chưa chọn ngày'}
              </Text>
              <Ionicons name="time-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
              <Text className="text-xs font-semibold text-slate-700">
                {draft.slot || 'Chưa chọn giờ'}
              </Text>
            </View>
          </View>

          {/* Section: Hồ sơ người khám bệnh (Card List) */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hồ sơ người khám bệnh *
              </Text>
              <Text className="text-2xs text-slate-400">
                Chọn người sẽ thực hiện khám
              </Text>
            </View>

            {/* List of Profile Cards */}
            <View className="gap-2.5">
              {profileList.map((item) => {
                const isSelected = String(selectedProfileId) === String(item.id)
                const badge = getRelationshipBadge(item.relationshipToAccount)
                const genderLabel = item.gender?.toLowerCase() === 'female' ? 'Nữ' : 'Nam'
                const dobFormatted = formatDob(item.dateOfBirth)
                const fullAddress =
                  item.address?.trim() ||
                  [item.streetAddress, item.wardName, item.districtName, item.provinceName]
                    .filter(Boolean)
                    .join(', ') ||
                  (item.relationshipToAccount === 'SELF' ? user?.address?.trim() : '')
                const cccdNumber = item.nationalId || item.identityCardNumber

                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    activeOpacity={0.8}
                    onPress={() => setSelectedProfileId(String(item.id))}
                    className="p-3.5 rounded-lg border border-slate-200/90 bg-white"
                  >
                    <View className="flex-row items-start justify-between">
                      {/* Profile details */}
                      <View className="flex-1 pr-3">
                        {/* 1. Header: Họ tên + Badge */}
                        <View className="flex-row items-center gap-2 flex-wrap mb-1.5">
                          <Text
                            className={`text-sm ${isSelected ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold'
                              }`}
                          >
                            {item.fullName}
                          </Text>
                          <View className={`px-2 py-0.5 rounded border ${badge.color}`}>
                            <Text className="text-[10px] font-bold">{badge.label}</Text>
                          </View>
                        </View>

                        {/* 2. SĐT & Ngày sinh - Giới tính */}
                        <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mb-1">
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="call-outline" size={12} color="#64748b" />
                            <Text className="text-xs text-slate-600">
                              {item.phoneNumber || user?.phone || 'Chưa cập nhật SĐT'}
                            </Text>
                          </View>

                          <View className="flex-row items-center gap-1">
                            <Ionicons name="calendar-outline" size={12} color="#64748b" />
                            <Text className="text-xs text-slate-600">
                              {dobFormatted ? `${dobFormatted} (${genderLabel})` : genderLabel}
                            </Text>
                          </View>
                        </View>

                        {/* 3. CCCD & BHYT */}
                        <View className="flex-row items-center flex-wrap gap-x-3 gap-y-1 mb-1">
                          <View className="flex-row items-center gap-1">
                            <Ionicons name="card-outline" size={12} color="#64748b" />
                            <Text className="text-xs text-slate-600">
                              CCCD: {cccdNumber || 'Chưa cập nhật'}
                            </Text>
                          </View>

                          {Boolean(item.healthInsuranceNumber) && (
                            <View className="flex-row items-center gap-1">
                              <Text className="text-slate-300">•</Text>
                              <Text className="text-xs text-emerald-700 font-medium">
                                BHYT: {item.healthInsuranceNumber}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* 4. Địa chỉ */}
                        <View className="flex-row items-start gap-1 mt-0.5">
                          <Ionicons name="location-outline" size={13} color="#64748b" style={{ marginTop: 1 }} />
                          <Text className="text-xs text-slate-600 flex-1 leading-4" numberOfLines={2}>
                            Địa chỉ: {fullAddress || 'Chưa cập nhật'}
                          </Text>
                        </View>
                      </View>

                      {/* Selected Line Checkmark (no background) */}
                      {isSelected ? (
                        <Ionicons name="checkmark" size={22} color="#059669" />
                      ) : (
                        <View className="w-[22px]" />
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}

              {/* Add New Profile Card at end of list */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowCreateModal(true)}
                className="border border-dashed border-slate-300 rounded-lg p-3.5 items-center justify-center bg-white active:bg-slate-50 flex-row gap-2 mt-1"
              >
                <Ionicons name="add" size={18} color="#059669" />
                <Text className="text-xs font-semibold text-slate-700">
                  Thêm hồ sơ người khám mới (Quét CCCD)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Bar: Xác nhận đặt lịch */}
        <View className="absolute bottom-0  right-0 bg-white border-t border-slate-100 px-4 py-3 flex-row items-center justify-between">

          <View className="w-[170px]">
            <Button
              title="Xác nhận"
              onPress={handleConfirm}
              isLoading={submitting}
              disabled={submitting}
              className="py-3 rounded-lg"
            />
          </View>
        </View>

        {/* Modal: Thêm hồ sơ bệnh nhân & Quét CCCD */}
        <CreateProfileModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleProfileCreated}
          defaultPhone={user?.phone}
        />
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
