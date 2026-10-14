import React from 'react'
import { Text, View } from 'react-native'

export interface StatItem {
  value: string
  label: string
}

export const CLINIC_STATS: StatItem[] = [
  { value: '50+', label: 'Bác sĩ chuyên khoa' },
  { value: '15+', label: 'Chuyên khoa' },
  { value: '03', label: 'Cơ sở hiện đại' },
  { value: '4.9★', label: 'Hài lòng' },
]

export const ClinicStatsSection: React.FC = () => {
  return (
    <View className="px-5 pt-8">
      <View className="bg-primary-50/50 border border-primary-100/90 rounded-lg p-4 shadow-2xs">
        <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-primary-100/60">
          <Text className="text-xs font-bold uppercase tracking-wider text-primary-800">
            Năng Lực Y Tế VitaCare
          </Text>
          <Text className="text-[11px] font-medium text-primary-600">Hệ thống chất lượng cao</Text>
        </View>
        <View className="flex-row justify-between items-center">
          {CLINIC_STATS.map((stat, i) => (
            <View key={i} className="items-center flex-1">
              <Text className="text-lg font-black text-primary-800">{stat.value}</Text>
              <Text className="text-[10px] font-bold text-slate-600 text-center mt-0.5">
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
