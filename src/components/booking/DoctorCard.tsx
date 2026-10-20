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
  online?: boolean
}

export const DoctorCard: React.FC<DoctorCardProps> = ({
  doctor,
  onSelect,
  selected = false,
  online = false,
}) => {
  const name =
    doctor.full_name || doctor.fullName || doctor.name || 'Bác sĩ chuyên khoa'
  const title = doctor.title || 'BS.'
  const specialty =
    typeof doctor.specialty === 'object'
      ? doctor.specialty?.name
      : doctor.specialty || doctor.specialty_name || 'Đa khoa'
  const fee = online
    ? doctor.onlineConsultationFee || doctor.consultation_fee || doctor.price || 300000
    : doctor.consultation_fee || doctor.price || 300000

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onSelect && onSelect(doctor)}
      className="rounded-lg p-3 mb-2.5 border border-slate-200/90 flex-row items-center shadow-xs"
      style={
        selected
          ? { backgroundColor: 'rgba(40, 167, 69, 0.06)' }
          : { backgroundColor: '#ffffff' }
      }
    >
      <Image
        source={{ uri: doctor.avatar }}
        className="w-16 h-16 rounded-lg bg-primary-50 mr-3"
        style={{ width: 64, height: 64, borderRadius: 8 }}
        contentFit="cover"
        transition={200}
      />
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <Text className="text-[11px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded mr-1.5 border border-primary-100">
              {title}
            </Text>
            <Text
              numberOfLines={1}
              className="text-sm font-bold text-slate-900 flex-1"
            >
              {name}
            </Text>
          </View>
          {selected ? (
            <View
              className="w-5 h-5 rounded-full items-center justify-center bg-[#28a745]"
              style={{ backgroundColor: '#28a745' }}
            >
              <Ionicons name="checkmark" size={13} color="#ffffff" />
            </View>
          ) : (
            <View className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
          )}
        </View>

        <Text numberOfLines={1} className="text-xs text-slate-500 mt-1">
          {specialty}
        </Text>

        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center">
            <Ionicons name="star" size={13} color="#f59e0b" />
            <Text className="text-xs font-semibold text-slate-700 ml-1">
              {doctor.rating || 5.0}
            </Text>
            {Boolean(doctor.experience_years) && (
              <Text className="text-xs text-slate-400 ml-1.5">
                • {doctor.experience_years} năm KN
              </Text>
            )}
          </View>
          <Text className="text-xs font-semibold text-slate-800">
            {formatCurrencyVi(fee)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}
