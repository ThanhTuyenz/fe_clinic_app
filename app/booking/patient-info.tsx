import { useState, useEffect } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'

import { useBookingStore } from '../../src/store/useBookingStore'
import { useAuthStore } from '../../src/store/useAuthStore'
import { patientProfileService, PatientProfile } from '../../src/services/patientProfileService'
import { bookingService } from '../../src/services/bookingService'
import { ScreenShell, Button } from '../../src/components/common'
import { CreateProfileModal } from '../../src/components/profile'
import { BookingTimeline } from '../../src/components/booking'

export default function PatientInfoScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, isAuthenticated } = useAuthStore()
  const { draft } = useBookingStore()

  const [submitting, setSubmitting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState<PatientProfile | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/(auth)/login')
    }
  }, [isAuthenticated, router])

  // Patient profiles query
  const { data: patientProfiles = [], refetch, isLoading: loadingProfiles, isError: profilesError } = useQuery({
    queryKey: ['patientProfiles', user?.id],
    queryFn: () => patientProfileService.getPatientProfiles(),
    enabled: isAuthenticated,
  })

  const profileList = patientProfiles

  // Auto-select first profile if none chosen
  useEffect(() => {
    if (profileList.length === 0) {
      setSelectedProfileId('')
    } else {
      const exists = profileList.some((p) => String(p.id) === String(selectedProfileId))
      if (!exists) {
        setSelectedProfileId(String(profileList[0].id))
      }
    }
  }, [profileList, selectedProfileId])

  // Relationship badge mapping
  const getRelationshipBadge = (rel?: string) => {
    switch (rel) {
      case 'SELF':
        return { label: 'Bản thân', color: 'bg-primary-50 text-primary-700 border-primary-200' }
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

  // Handle edit profile modal
  const handleEditProfile = (item: PatientProfile) => {
    const fullAddress =
      item.address?.trim() ||
      [item.streetAddress, item.wardName, item.districtName, item.provinceName]
        .filter(Boolean)
        .join(', ')

    setEditingProfile({
      ...item,
      phoneNumber: item.phoneNumber || '',
      address: fullAddress,
    })
    setShowCreateModal(true)
  }

  // Handle add new profile modal
  const handleAddNewProfile = () => {
    setEditingProfile(null)
    setShowCreateModal(true)
  }

  // Handle callback after creating or updating a profile
  const handleProfileSaved = (savedProf: PatientProfile) => {
    queryClient.setQueryData<PatientProfile[]>(['patientProfiles', user?.id], (previous = []) => [
      savedProf,
      ...previous.filter((profile) => profile.id !== savedProf.id),
    ])
    void refetch()
    if (savedProf?.id) {
      setSelectedProfileId(String(savedProf.id))
    }
    setShowCreateModal(false)
    setEditingProfile(null)
  }

  // Cross-platform Alert helper
  const showFeedback = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}: ${message}`)
      onOk?.()
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined)
    }
  }

  // Handle Continue to Confirm & Voucher screen
  const handleConfirm = async () => {
    try {
      setSubmitting(true)

      if (
        draft.bookingMethod === 'ONLINE_CONSULTATION' &&
        (!draft.date || !draft.slot || !draft.slotId)
      ) {
        throw new Error('Vui lòng chọn ngày và khung giờ tư vấn trước khi tiếp tục.')
      }

      const todayStr = new Date().toISOString().slice(0, 10)
      const effectiveDate = draft.date || todayStr
      const effectiveSlot = draft.slot || '08:00'

      // Revalidate against the authenticated account; a local card is not a saved profile.
      const savedProfiles = await patientProfileService.getPatientProfiles()
      const resolvedProfile = savedProfiles.find((profile) => String(profile.id) === selectedProfileId)
      if (!resolvedProfile) {
        throw new Error('Vui lòng thêm và chọn hồ sơ người khám đã lưu trước khi tiếp tục.')
      }

      // 2. Resolve the slot for legacy flows that do not carry a slot ID yet.
      let slotId = draft.slotId
      if (!slotId) {
        try {
          const packageId = draft.healthPackage?.id || draft.specialtyService?.id
          if (draft.doctor?.id) {
            const slots = await bookingService.getBookingSlots({
              doctorId: String(draft.doctor.id),
              date: effectiveDate,
              branchId: draft.branchId,
            })
            const target = slots.slots.find((s) => s.startTime?.slice(0, 5) === effectiveSlot.slice(0, 5))
            const doctorSlot = target?.doctors.find((slot) => String(slot.doctorId) === String(draft.doctor?.id))
            slotId = doctorSlot?.slotId || target?.representativeSlotId
          } else if (packageId) {
            const slots = await bookingService.getBookingSlots({
              servicePackageId: String(packageId),
              date: effectiveDate,
              branchId: draft.branchId,
            })
            const target = slots.slots.find((s) => s.startTime?.slice(0, 5) === effectiveSlot.slice(0, 5))
            slotId = target?.representativeSlotId
          }
        } catch (slotErr) {
          console.warn('[patient-info] could not resolve slotId:', slotErr)
        }
      }

      // 2. Save to booking store
      useBookingStore.setState((state) => ({
        draft: {
          ...state.draft,
          date: effectiveDate,
          slot: effectiveSlot,
          slotId: slotId || state.draft.slotId,
          selectedProfile: resolvedProfile,
          patientProfileId: String(resolvedProfile!.id),
        },
        step: 3,
      }))

      // 4. Navigate to Screen 3: Xác nhận thông tin và voucher
      router.push('/booking/confirm')
    } catch (err: any) {
      console.error('[Booking Patient Info] handleConfirm error:', err)
      showFeedback('Thông báo', err.message || 'Không thể chọn hồ sơ bệnh nhân.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <ScreenShell showBackButton title="Thông tin người khám">
        <View className="flex-1 items-center justify-center bg-slate-50">
          <ActivityIndicator size="large" color="#28a745" />
          <Text className="mt-3 text-xs text-slate-500 font-medium">Đang chuyển hướng sang đăng nhập...</Text>
        </View>
      </ScreenShell>
    )
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
          {/* Section: Hồ sơ người khám bệnh (Card List) */}
          <View className="mb-5">
            <View className="flex-row items-center justify-between mb-2.5">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Hồ sơ người khám bệnh *
              </Text>
            </View>

            {loadingProfiles ? (
              <View className="py-8 items-center gap-3">
                <ActivityIndicator color="#28a745" />
                <Text className="text-sm text-slate-500">Đang tải hồ sơ người khám...</Text>
              </View>
            ) : profileList.length === 0 ? (
              <View className="rounded-xl bg-slate-50 border border-slate-200 p-6 items-center gap-3 mb-4">
                <Ionicons name="person-add-outline" size={32} color="#64748b" />
                <Text className="text-base font-semibold text-slate-800">Chưa có hồ sơ khám bệnh</Text>
                <Text className="text-sm leading-5 text-slate-500 text-center">
                  Thêm hồ sơ và lưu thông tin người khám trước khi tiếp tục đặt lịch.
                </Text>
              </View>
            ) : profilesError ? (
              <View className="rounded-xl bg-slate-50 border border-slate-200 p-5 items-center gap-3 mb-4">
                <Text className="text-sm text-slate-700 text-center">Không thể tải hồ sơ người khám. Vui lòng thử lại.</Text>
                <TouchableOpacity onPress={() => { void refetch() }} className="px-4 py-2">
                  <Text className="text-sm font-semibold text-primary-700">Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* List of saved profile cards */}
            <View className="gap-2.5">
              {!loadingProfiles && !profilesError && profileList.map((item) => {
                const isSelected = String(selectedProfileId) === String(item.id)
                const badge = getRelationshipBadge(item.relationshipToAccount)
                const genderLabel = item.gender?.toUpperCase() === 'FEMALE' ? 'Nữ' : item.gender?.toUpperCase() === 'MALE' ? 'Nam' : item.gender?.toUpperCase() === 'OTHER' ? 'Khác' : 'Chưa cập nhật giới tính'
                const dobFormatted = formatDob(item.dateOfBirth)
                const fullAddress =
                  item.address?.trim() ||
                  [item.streetAddress, item.wardName, item.districtName, item.provinceName]
                    .filter(Boolean)
                    .join(', ')
                const cccdNumber = item.nationalId || item.identityCardNumber

                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    activeOpacity={0.8}
                    onPress={() => setSelectedProfileId(String(item.id))}
                    className={`p-3.5 rounded-lg border border-slate-200/90 ${
                      isSelected ? 'bg-[#28a745]/[0.06]' : 'bg-white'
                    }`}
                    style={isSelected ? { backgroundColor: 'rgba(40, 167, 69, 0.06)' } : { backgroundColor: '#ffffff' }}
                  >
                    <View className="flex-row items-start justify-between">
                      {/* Profile details */}
                      <View className="flex-1 pr-2">
                        {/* 1. Header: Họ tên + Badge */}
                        <View className="flex-row items-center gap-2 flex-wrap mb-1.5">
                          <Text
                            className={`text-sm ${
                              isSelected ? 'text-slate-900 font-bold' : 'text-slate-700 font-semibold'
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
                              {item.phoneNumber || 'Chưa cập nhật SĐT'}
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
                              <Text className="text-xs text-primary-700 font-medium">
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

                      {/* Selected Line Checkmark */}
                      {isSelected ? (
                        <Ionicons name="checkmark" size={22} color="#28a745" />
                      ) : (
                        <View className="w-[22px]" />
                      )}
                    </View>

                    {/* Bottom Action: Xem & Cập nhật hồ sơ */}
                    <View className="flex-row items-center justify-end pt-2 mt-2 border-t border-[#28a745]/15">
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={(e) => {
                          e.stopPropagation?.()
                          handleEditProfile(item)
                        }}
                        className="flex-row items-center gap-1 bg-white border border-slate-200/90 px-2.5 py-1 rounded active:bg-slate-50"
                      >
                        <Ionicons name="create-outline" size={13} color="#28a745" />
                        <Text className="text-[11px] font-bold text-slate-700">Chi tiết / Sửa hồ sơ</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                )
              })}

              {/* Add New Profile Card at end of list */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleAddNewProfile}
                className="border border-dashed border-slate-300 rounded-lg p-3.5 items-center justify-center bg-white active:bg-slate-50 flex-row gap-2 mt-1"
              >
                <Ionicons name="add" size={18} color="#28a745" />
                <Text className="text-xs font-semibold text-slate-700">
                  Thêm hồ sơ người khám mới (Quét CCCD)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Bar: Xác nhận đặt lịch */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3">
          <Button
            title="Xác nhận"
            onPress={handleConfirm}
            isLoading={submitting}
            disabled={submitting || loadingProfiles || profilesError || !profileList.some((profile) => String(profile.id) === selectedProfileId)}
            className="py-3 rounded-lg w-full"
          />
        </View>

        {/* Modal: Thêm / Xem chi tiết & Cập nhật hồ sơ bệnh nhân */}
        <CreateProfileModal
          visible={showCreateModal}
          initialData={editingProfile}
          onClose={() => {
            setShowCreateModal(false)
            setEditingProfile(null)
          }}
          onSuccess={handleProfileSaved}
          defaultPhone={user?.phone}
        />
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
