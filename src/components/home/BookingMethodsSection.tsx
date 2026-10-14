import React from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'

export interface BookingMethodItem {
  id: string
  code: string
  name: string
  image: string
  color: string
  path: string
}

export const BOOKING_METHODS: BookingMethodItem[] = [
  {
    id: 'specialty',
    code: 'SPECIALTY_EXAM',
    name: 'Khám chuyên khoa',
    image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=300&q=80',
    color: '#28a745',
    path: '/booking/specialty',
  },
  {
    id: 'doctor',
    code: 'CONSULTATION',
    name: 'Khám cùng bác sĩ',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=300&q=80',
    color: '#2563eb',
    path: '/booking/doctor',
  },
  {
    id: 'online',
    code: 'ONLINE_CONSULTATION',
    name: 'Tư vấn online',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=300&q=80',
    color: '#0f766e',
    path: '/booking/online',
  },
  {
    id: 'followup',
    code: 'FOLLOWUP_EXAM',
    name: 'Tái khám',
    image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=300&q=80',
    color: '#e11d48',
    path: '/booking/doctor?flow=followup',
  },
  {
    id: 'family',
    code: 'FAMILY_BOOKING',
    name: 'Khám gia đình',
    image: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?auto=format&fit=crop&w=300&q=80',
    color: '#7c3aed',
    path: '/booking/specialty?flow=family',
  },
  {
    id: 'after-hours',
    code: 'AFTER_HOURS',
    name: 'Khám ngoài giờ',
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=300&q=80',
    color: '#d97706',
    path: '/booking/after-hours',
  },
]

export interface BookingMethodsSectionProps {
  selectedMethod: string
  onSelectMethod: (method: BookingMethodItem) => void
  onViewAll: () => void
}

export const BookingMethodsSection: React.FC<BookingMethodsSectionProps> = ({
  selectedMethod,
  onSelectMethod,
  onViewAll,
}) => {
  return (
    <View className="pt-6">
      <View className="px-5 flex-row items-center justify-between mb-3.5">
        <View className="flex-1 mr-2">
          <Text className="text-base font-extrabold text-slate-900 tracking-tight">
            Phương thức khám bệnh
          </Text>
        </View>
        <TouchableOpacity onPress={onViewAll}>
          <Text className="text-xs font-semibold text-primary-600">Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 8 }}
      >
        {BOOKING_METHODS.map((method) => {
          const isSelected = selectedMethod === method.id
          return (
            <TouchableOpacity
              key={method.id}
              activeOpacity={0.8}
              onPress={() => onSelectMethod(method)}
              className={`mr-2.5 px-4 py-2 rounded-lg border transition-all ${
                isSelected ? 'border-primary-300' : 'border-slate-200/90'
              }`}
              style={
                isSelected
                  ? {
                      backgroundColor: 'rgba(5, 150, 105, 0.08)',
                      borderColor: 'rgba(5, 150, 105, 0.38)',
                    }
                  : {
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                    }
              }
            >
              <Text
                numberOfLines={1}
                className={`text-xs ${
                  isSelected ? 'text-primary-700 font-bold' : 'text-slate-600 font-medium'
                }`}
              >
                {method.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </View>
  )
}
