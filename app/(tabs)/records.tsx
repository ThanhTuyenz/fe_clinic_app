import { useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { ScreenShell, Button } from '../../src/components/common'
import { CreateProfileModal } from '../../src/components/profile'
import { useAuthStore } from '../../src/store/useAuthStore'
import { patientProfileService, PatientProfile } from '../../src/services/patientProfileService'

export default function RecordsScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [editingProfile, setEditingProfile] = useState<PatientProfile | null>(null)

  const {
    data: profiles = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['patientProfiles', user?.id],
    queryFn: () => patientProfileService.getPatientProfiles(),
    enabled: isAuthenticated,
  })

  const getRelationshipBadge = (rel?: string) => {
    switch (rel) {
      case 'SELF':
        return { label: 'Hồ sơ chính', color: 'bg-primary-50 text-primary-700 border-primary-200' }
      case 'CHILD':
        return { label: 'Con ruột', color: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'PARENT':
        return { label: 'Bố/Mẹ', color: 'bg-amber-50 text-amber-700 border-amber-200' }
      case 'SPOUSE':
        return { label: 'Vợ/Chồng', color: 'bg-purple-50 text-purple-700 border-purple-200' }
      default:
        return { label: 'Người thân', color: 'bg-slate-100 text-slate-700 border-slate-200' }
    }
  }

  const formatDobVi = (dob?: string) => {
    if (!dob) return ''
    const clean = dob.includes('T') ? dob.split('T')[0] : dob
    const parts = clean.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return clean
  }

  const handleEditProfile = (profile: PatientProfile) => {
    setEditingProfile(profile)
    setShowCreateModal(true)
  }

  const renderProfileItem = ({ item }: { item: PatientProfile }) => {
    const badge = getRelationshipBadge(item.relationshipToAccount)
    const genderLabel = item.gender === 'FEMALE' ? 'Nữ' : 'Nam'
    const fullAddress =
      item.address ||
      [item.streetAddress, item.wardName, item.districtName, item.provinceName]
        .filter(Boolean)
        .join(', ')

    return (
      <View className="bg-white rounded-lg p-4 mb-3 border border-slate-200/90">
        {/* Tiêu đề hồ sơ & Avatar Line Icon */}
        <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
          <View className="flex-row items-center flex-1 pr-2">
            <View className="w-10 h-10 rounded-lg bg-primary-50/80 items-center justify-center mr-3 border border-primary-200/80">
              <Ionicons name="person-outline" size={20} color="#28a745" />
            </View>
            <View className="flex-1">
              <Text numberOfLines={1} className="text-sm font-extrabold text-slate-900">
                {item.fullName}
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                {genderLabel} {item.dateOfBirth ? `• ${formatDobVi(item.dateOfBirth)}` : ''}
              </Text>
            </View>
          </View>

          <View className={`px-2 py-0.5 rounded-md border ${badge.color}`}>
            <Text className="text-[10px] font-bold">{badge.label}</Text>
          </View>
        </View>

        {/* Thông tin chi tiết bổ sung */}
        <View className="py-2.5 space-y-1.5">
          {/* CCCD / Số định danh */}
          <View className="flex-row items-center justify-between text-xs my-0.5">
            <View className="flex-row items-center">
              <Ionicons name="card-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
              <Text className="text-xs text-slate-400">CCCD/Định danh:</Text>
            </View>
            <Text className="text-xs font-semibold text-slate-700">
              {item.identityCardNumber || item.nationalId || 'Chưa cập nhật'}
            </Text>
          </View>

          {/* Mã BHYT */}
          <View className="flex-row items-center justify-between text-xs my-0.5">
            <View className="flex-row items-center">
              <Ionicons name="shield-checkmark-outline" size={13} color="#28a745" style={{ marginRight: 6 }} />
              <Text className="text-xs text-slate-400">Mã BHYT:</Text>
            </View>
            <Text
              className={`text-xs font-semibold ${
                item.healthInsuranceNumber ? 'text-primary-700' : 'text-slate-400'
              }`}
            >
              {item.healthInsuranceNumber || 'Chưa cập nhật'}
            </Text>
          </View>

          {/* Số điện thoại */}
          <View className="flex-row items-center justify-between text-xs my-0.5">
            <View className="flex-row items-center">
              <Ionicons name="call-outline" size={13} color="#94a3b8" style={{ marginRight: 6 }} />
              <Text className="text-xs text-slate-400">Số điện thoại:</Text>
            </View>
            <Text className="text-xs font-semibold text-slate-700">
              {item.phoneNumber || 'Chưa cập nhật'}
            </Text>
          </View>

          {/* Địa chỉ nơi ở */}
          {Boolean(fullAddress) && (
            <View className="flex-row items-start justify-between text-xs my-0.5">
              <View className="flex-row items-center">
                <Ionicons
                  name="location-outline"
                  size={13}
                  color="#94a3b8"
                  style={{ marginRight: 6, marginTop: 1 }}
                />
                <Text className="text-xs text-slate-400">Địa chỉ:</Text>
              </View>
              <Text
                numberOfLines={2}
                className="text-xs font-medium text-slate-700 flex-1 text-right ml-4"
              >
                {fullAddress}
              </Text>
            </View>
          )}
        </View>

        {/* Nút Thao tác: Lịch sử khám & Cập nhật thông tin (2 màu sắc phân biệt) */}
        <View className="flex-row items-center pt-3 border-t border-slate-100 gap-2.5">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/appointments')}
            className="flex-1 bg-blue-50 border border-blue-200/90 py-2.5 rounded-lg flex-row items-center justify-center active:bg-blue-100"
          >
            <Ionicons name="time-outline" size={14} color="#2563eb" style={{ marginRight: 5 }} />
            <Text className="text-xs font-normal text-blue-700">Lịch sử khám</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => handleEditProfile(item)}
            className="flex-1 bg-slate-900 active:bg-slate-800 py-2.5 rounded-lg flex-row items-center justify-center shadow-2xs"
          >
            <Ionicons name="create-outline" size={14} color="#ffffff" style={{ marginRight: 5 }} />
            <Text className="text-xs font-normal text-white">Cập nhật thông tin</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <ScreenShell
      title="Hồ sơ sức khỏe"
      rightElement={
        isAuthenticated ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              setEditingProfile(null)
              setShowCreateModal(true)
            }}
            className="flex-row items-center bg-blue-50 border border-blue-200/90 px-3 py-1.5 rounded active:bg-blue-100"
          >
            <Ionicons name="qr-code-outline" size={15} color="#2563eb" style={{ marginRight: 5 }} />
            <Text className="text-xs font-bold text-blue-700">Thêm hồ sơ</Text>
          </TouchableOpacity>
        ) : undefined
      }
    >
      <View className="flex-1 px-5 pt-3">
        {!isAuthenticated ? (
          <View className="bg-white p-6 rounded-lg border border-slate-200/90 items-center my-auto">
            <View className="w-16 h-16 rounded-full bg-primary-50 items-center justify-center mb-3">
              <Ionicons name="document-text-outline" size={32} color="#28a745" />
            </View>
            <Text className="text-base font-bold text-slate-800 mb-1">
              Quản lý hồ sơ y tế số
            </Text>
            <Text className="text-xs text-slate-500 text-center mb-5 leading-relaxed">
              Vui lòng đăng nhập để lưu trữ thông tin BHYT, CCCD và theo dõi hồ sơ bệnh án của bạn và người thân.
            </Text>
            <Button
              title="Đăng nhập ngay"
              onPress={() => router.push('/(auth)/login')}
              className="w-48"
            />
          </View>
        ) : isLoading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="small" color="#28a745" />
            <Text className="text-xs text-slate-400 mt-2 font-medium">
              Đang tải danh sách hồ sơ...
            </Text>
          </View>
        ) : profiles.length === 0 ? (
          <View className="flex-1 justify-center items-center py-16">
            <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Ionicons name="folder-open-outline" size={30} color="#94a3b8" />
            </View>
            <Text className="text-sm font-bold text-slate-700">Chưa có hồ sơ khám bệnh</Text>
            <Text className="text-xs text-slate-400 text-center mt-1 mb-4 px-6 leading-relaxed">
              Tạo hồ sơ bệnh nhân bằng cách quét mã QR CCCD hoặc nhập thông tin để đặt khám nhanh chóng.
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setEditingProfile(null)
                  setShowCreateModal(true)
                }}
                className="bg-primary-600 px-5 py-2.5 rounded-lg flex-row items-center shadow-xs"
              >
                <Ionicons name="qr-code-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text className="text-xs font-bold text-white">Quét CCCD tạo hồ sơ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <FlatList
            data={profiles}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderProfileItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 24 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                tintColor="#28a745"
                colors={['#28a745']}
                onRefresh={() => { void refetch() }}
              />
            }
          />
        )}
      </View>

      {/* Modal: Thêm / Cập nhật hồ sơ & Quét CCCD */}
      <CreateProfileModal
        visible={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingProfile(null)
        }}
        onSuccess={() => {
          refetch()
          setEditingProfile(null)
        }}
        defaultPhone={user?.phone}
        initialData={editingProfile}
      />
    </ScreenShell>
  )
}
