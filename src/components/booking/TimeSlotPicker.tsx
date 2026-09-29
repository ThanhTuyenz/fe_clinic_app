import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

import { TimeSlot } from '../../types/appointment'

// Danh sách slot giờ mặc định của phòng khám
export const DEFAULT_CLINIC_SLOTS = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
]

interface TimeSlotPickerProps {
  availableSlots: Array<string | TimeSlot>
  selectedSlot: string
  onSelectSlot: (slot: string, slotId?: string) => void
  isLoading?: boolean
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  availableSlots,
  selectedSlot,
  onSelectSlot,
  isLoading = false,
}) => {
  // Chuẩn hóa slots
  const slotMap = React.useMemo(() => {
    const map = new Map<string, { isAvailable: boolean; id?: string }>()
    availableSlots.forEach((item) => {
      if (typeof item === 'string') {
        const timeKey = item.trim().slice(0, 5)
        map.set(timeKey, { isAvailable: true })
      } else if (item && item.startTime) {
        const timeKey = String(item.startTime).trim().slice(0, 5)
        map.set(timeKey, { isAvailable: item.isAvailable !== false, id: item.id })
      }
    })
    return map
  }, [availableSlots])

  // Phân chia ca sáng và ca chiều
  const morningSlots = DEFAULT_CLINIC_SLOTS.filter((s) => s < '12:00')
  const afternoonSlots = DEFAULT_CLINIC_SLOTS.filter((s) => s >= '12:00')

  const renderSlotButton = (slot: string) => {
    const slotInfo = slotMap.get(slot)
    const isAvailable = availableSlots.length > 0 ? Boolean(slotInfo && slotInfo.isAvailable) : true
    const isSelected = selectedSlot === slot

    return (
      <TouchableOpacity
        key={slot}
        activeOpacity={0.7}
        disabled={!isAvailable || isLoading}
        onPress={() => onSelectSlot(slot, slotInfo?.id)}
        className={`w-[22%] py-2.5 rounded-lg items-center justify-center m-1 border ${
          isSelected
            ? 'bg-emerald-600 border-emerald-600'
            : isAvailable
              ? 'bg-white border-slate-200 active:border-emerald-400'
              : 'bg-slate-100 border-slate-100 opacity-40'
        }`}
      >
        <Text
          className={`text-sm font-semibold ${
            isSelected
              ? 'text-white'
              : isAvailable
                ? 'text-slate-800'
                : 'text-slate-400'
          }`}
        >
          {slot}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View className="mb-4">
      {/* Ca Sáng */}
      <View className="mb-3.5">
        <View className="flex-row items-center mb-2">
          <Ionicons name="sunny-outline" size={18} color="#0284c7" />
          <Text className="text-sm font-bold text-slate-800 ml-1.5">
            Ca sáng (08:00 - 11:30)
          </Text>
        </View>
        <View className="flex-row flex-wrap -mx-1">
          {morningSlots.map(renderSlotButton)}
        </View>
      </View>

      {/* Ca Chiều */}
      <View>
        <View className="flex-row items-center mb-2">
          <Ionicons name="partly-sunny-outline" size={18} color="#f59e0b" />
          <Text className="text-sm font-bold text-slate-800 ml-1.5">
            Ca chiều (13:30 - 17:00)
          </Text>
        </View>
        <View className="flex-row flex-wrap -mx-1">
          {afternoonSlots.map(renderSlotButton)}
        </View>
      </View>
    </View>
  )
}
