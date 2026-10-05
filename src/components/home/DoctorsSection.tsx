import React from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Doctor } from '../../types/doctor'
import { DoctorCard } from './DoctorCard'

export interface DoctorsSectionProps {
  doctors: Doctor[]
  isLoading?: boolean
  searchQuery?: string
  onSelectDoctor: (doctor: Doctor) => void
  onViewAll: () => void
}

export const DoctorsSection: React.FC<DoctorsSectionProps> = ({
  doctors,
  isLoading,
  searchQuery,
  onSelectDoctor,
  onViewAll,
}) => {
  return (
    <View className="mt-8 pt-2" style={{ marginTop: 32 }}>
      <View className="px-5 flex-row items-center justify-between mb-3.5">
        <View>
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Đội ngũ bác sĩ tiêu biểu
          </Text>
        </View>
        <TouchableOpacity onPress={onViewAll}>
          <Text className="text-xs font-semibold text-emerald-600">Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color="#059669" className="py-8" />
      ) : doctors.length === 0 ? (
        <View className="bg-white mx-5 p-6 rounded-lg border border-slate-100 items-center justify-center">
          <Ionicons name="medical-outline" size={32} color="#cbd5e1" />
          <Text className="text-slate-400 text-xs text-center mt-2 font-medium">
            {searchQuery ? 'Không tìm thấy bác sĩ phù hợp với từ khóa' : 'Chưa có dữ liệu bác sĩ'}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          {doctors.slice(0, 8).map((doc) => (
            <DoctorCard key={doc.id} doctor={doc} onSelect={onSelectDoctor} />
          ))}
        </ScrollView>
      )}
    </View>
  )
}
