import React from 'react'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Doctor } from '../../types/doctor'
import { DoctorCard } from './DoctorCard'

interface DoctorListSectionProps {
  method: string
  doctors: Doctor[]
  displayedDoctors: Doctor[]
  selectedDoctor: Doctor | null
  loadingDoctors: boolean
  doctorSearch: string
  setDoctorSearch: (text: string) => void
  onSelectDoctor: (doctor: Doctor) => void
}

export const DoctorListSection: React.FC<DoctorListSectionProps> = ({
  method,
  doctors,
  displayedDoctors,
  selectedDoctor,
  loadingDoctors,
  doctorSearch,
  setDoctorSearch,
  onSelectDoctor,
}) => {
  return (
    <View className="mt-1">
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="text-xs font-bold text-slate-700">
          {method === 'ONLINE_CONSULTATION' ? 'Bác sĩ tư vấn online' : 'Bác sĩ điều trị'}{' '}
          <Text className="text-rose-500">*</Text>
        </Text>
        {doctors.length > 0 && (
          <Text className="text-[11px] font-medium text-primary-700">
            {doctors.length} bác sĩ khả dụng
          </Text>
        )}
      </View>

      {/* Ô tìm kiếm nhanh khi có từ 4 bác sĩ trở lên */}
      {doctors.length > 3 && (
        <View className="mb-2.5 flex-row items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Ionicons name="search" size={15} color="#94a3b8" />
          <TextInput
            placeholder="Tìm theo tên bác sĩ, chuyên khoa..."
            placeholderTextColor="#94a3b8"
            value={doctorSearch}
            onChangeText={setDoctorSearch}
            className="flex-1 ml-2 text-xs text-slate-800 p-0"
          />
          {Boolean(doctorSearch) && (
            <TouchableOpacity onPress={() => setDoctorSearch('')}>
              <Ionicons name="close-circle" size={15} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {loadingDoctors ? (
        <View className="p-6 items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <ActivityIndicator size="small" color="#28a745" />
          <Text className="text-xs text-slate-500 mt-2">Đang tải danh sách bác sĩ...</Text>
        </View>
      ) : displayedDoctors.length === 0 ? (
        <View className="p-4 items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
          <Ionicons name="alert-circle-outline" size={24} color="#94a3b8" />
          <Text className="text-xs text-slate-500 text-center mt-1">
            {doctorSearch
              ? 'Không tìm thấy bác sĩ phù hợp với từ khóa'
              : 'Chưa có bác sĩ tại cơ sở này. Vui lòng chọn cơ sở khác.'}
          </Text>
        </View>
      ) : (
        <View>
          {displayedDoctors.map((doc) => {
            const isSelected = selectedDoctor?.id === doc.id
            return (
              <DoctorCard
                key={doc.id}
                doctor={doc}
                selected={isSelected}
                online={method === 'ONLINE_CONSULTATION'}
                onSelect={onSelectDoctor}
              />
            )
          })}
        </View>
      )}
    </View>
  )
}
