import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Doctor } from '../../types/doctor'
import { formatCurrencyVi } from '../../utils/date'

export interface DoctorCardProps {
  doctor: Doctor
  onSelect: (doctor: Doctor) => void
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onSelect }) => {
  const docName = (doctor.full_name || doctor.fullName || doctor.name || 'Bác sĩ').trim()
  const docSpecialty =
    typeof doctor.specialty === 'object'
      ? doctor.specialty?.name
      : doctor.specialty || doctor.specialty_name || 'Đa khoa'

  // Làm sạch học vị, tránh lỗi lặp
  let displayName = docName
  if (/^(bác sĩ|bs\.?)/i.test(displayName)) {
    displayName = displayName
      .replace(/^(bác sĩ|bs\.?)\s*(cki|ckii)?\s*(bác sĩ|bs\.?)\s*(cki|ckii)?/gi, 'BS. $2 $4')
      .trim()
  } else if (doctor.title) {
    displayName = `${doctor.title} ${displayName}`
  } else {
    displayName = `BS. ${displayName}`
  }

  const fee = doctor.consultation_fee || doctor.price || 300000

  return (
    <View
      className="w-64 bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden mr-3.5 justify-between"
      style={{ width: 256 }}
    >
      {/* Ảnh bìa bác sĩ tràn viền */}
      <View className="h-32 w-full bg-slate-100 relative">
        <Image
          source={{ uri: doctor.avatar }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      </View>

      {/* Nội dung thông tin bác sĩ */}
      <View className="p-3.5 flex-1 justify-between">
        <View>
          <View style={{ minHeight: 40, justifyContent: 'flex-start' }}>
            <Text numberOfLines={2} className="text-sm font-extrabold text-slate-900 leading-snug">
              {displayName}
            </Text>
          </View>

          <View style={{ minHeight: 34, justifyContent: 'flex-start', marginTop: 3 }}>
            <Text numberOfLines={2} className="text-xs text-slate-500 leading-relaxed">
              Chuyên khoa {docSpecialty}
              {doctor.experience_years ? ` • ${doctor.experience_years} năm kinh nghiệm` : ''}
            </Text>
          </View>
        </View>

        {/* Phần giá & nút bấm */}
        <View className="mt-3 pt-2.5 border-t border-slate-100">
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center">
              <Ionicons name="star" size={13} color="#f59e0b" />
              <Text className="text-xs font-bold text-slate-700 ml-1">
                {doctor.rating || 5.0}
              </Text>
              <Text className="text-xs text-slate-400 font-medium ml-1.5">• Giá khám</Text>
            </View>
            <Text className="text-sm font-bold text-slate-800">{formatCurrencyVi(fee)}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onSelect(doctor)}
            className="w-full bg-emerald-700 active:bg-emerald-800 py-2.5 rounded-lg items-center justify-center shadow-2xs"
          >
            <Text className="text-xs font-bold text-white">Đặt khám ngay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
