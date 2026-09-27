import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Doctor } from '../../types/doctor'
import { formatCurrencyVi } from '../../utils/date'

interface DoctorCardProps {
  doctor: Doctor
  onSelect?: (doctor: Doctor) => void
  selected?: boolean
}

export const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  onSelect,
  selected = false,
}) => {
  const name =
    doctor.full_name || doctor.fullName || doctor.name || 'Bác sĩ chuyên khoa'
  const title = doctor.title || 'BS.'
  const specialty =
    typeof doctor.specialty === 'object'
      ? doctor.specialty?.name
      : doctor.specialty || doctor.specialty_name || 'Đa khoa'
  const fee = doctor.consultation_fee || doctor.price || 300000

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onSelect && onSelect(doctor)}
      className={`bg-white rounded-2xl p-4 mb-3 border flex-row items-center shadow-sm ${
        selected ? 'border-sky-500 bg-sky-50/30' : 'border-slate-100'
      }`}
    >
      <Image
        source={{ uri: doctor.avatar }}
        className="w-18 h-18 rounded-2xl bg-slate-100 mr-3.5"
        style={{ width: 72, height: 72, borderRadius: 16 }}
        contentFit="cover"
        transition={200}
      />
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-xs font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full mr-1.5">
            {title}
          </Text>
          <Text
            numberOfLines={1}
            className="text-base font-bold text-slate-800 flex-1"
          >
            {name}
          </Text>
        </View>

        <Text numberOfLines={1} className="text-sm text-slate-500 mt-1">
          {specialty}
        </Text>

        <View className="flex-row items-center justify-between mt-2.5">
          <View className="flex-row items-center">
            <Ionicons name="star" size={14} color="#f59e0b" />
            <Text className="text-xs font-semibold text-slate-700 ml-1">
              {doctor.rating || 5.0}
            </Text>
            {Boolean(doctor.experience_years) && (
              <Text className="text-xs text-slate-400 ml-2">
                • {doctor.experience_years} năm KN
              </Text>
            )}
          </View>
          <Text className="text-sm font-bold text-teal-600">
            {formatCurrencyVi(fee)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
