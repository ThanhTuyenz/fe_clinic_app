import React from 'react'
import { TextInput, TouchableOpacity, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

export interface HomeSearchBarProps {
  value: string
  onChangeText: (text: string) => void
  onFilterPress: () => void
}

export const HomeSearchBar: React.FC<HomeSearchBarProps> = ({
  value,
  onChangeText,
  onFilterPress,
}) => {
  return (
    <View className="bg-white px-5 pt-2 pb-3 border-b border-slate-100">
      <View className="flex-row items-center bg-slate-50 border border-slate-200/90 rounded-lg px-3.5 py-2 shadow-2xs">
        <Ionicons name="search-outline" size={17} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Tìm bác sĩ, chuyên khoa, gói khám..."
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          className="flex-1 text-xs text-slate-800 p-0 outline-none"
          style={[{ outlineWidth: 0, outlineStyle: 'none' } as any]}
        />
        {value ? (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onFilterPress}>
            <View className="w-6 h-6 rounded-md bg-emerald-50 items-center justify-center">
              <Ionicons name="filter-outline" size={13} color="#059669" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}
