import React from 'react'
import { Text, TouchableOpacity, View } from 'react-native'
import { Image } from 'expo-image'
import Ionicons from '@expo/vector-icons/Ionicons'
import { formatCurrencyVi } from '../../utils/date'

export interface PackageCardBadge {
  label: string
  color: string
  bg: string
  icon?: keyof typeof Ionicons.glyphMap
}

export interface PackageCardProps {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  specialtyName?: string
  badge?: PackageCardBadge | null
  onPress: () => void
}

export const getPackageImage = (name: string = '', specialtyName: string = ''): string => {
  const combined = (name + ' ' + specialtyName).toLowerCase()
  if (combined.includes('tim') || combined.includes('mạch') || combined.includes('huyết áp')) {
    return 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=600&auto=format&fit=crop&q=80'
  }
  if (combined.includes('tiêu hóa') || combined.includes('gan') || combined.includes('mật') || combined.includes('dạ dày')) {
    return 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80'
  }
  if (
    combined.includes('ngoại') ||
    combined.includes('chấn thương') ||
    combined.includes('khớp') ||
    combined.includes('xương') ||
    combined.includes('cột sống')
  ) {
    return 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=600&auto=format&fit=crop&q=80'
  }
  if (combined.includes('nhi') || combined.includes('bé') || combined.includes('trẻ')) {
    return 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80'
  }
  if (combined.includes('da') || combined.includes('liễu')) {
    return 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80'
  }
  return 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80'
}

export const PackageCard: React.FC<PackageCardProps> = ({
  name,
  description,
  price,
  image,
  specialtyName,
  badge,
  onPress,
}) => {
  const imgSrc = image || getPackageImage(name, specialtyName)

  return (
    <View
      className="w-64 bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden mr-3.5 justify-between"
      style={{ width: 256 }}
    >
      {/* Ảnh bìa + Floating Badge nếu có */}
      <View className="h-32 w-full bg-slate-100 relative">
        <Image
          source={{ uri: imgSrc }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
        {badge && (
          <View
            className={`absolute top-2.5 left-2.5 px-2 py-0.5 rounded border flex-row items-center shadow-2xs ${badge.bg}`}
          >
            {badge.icon && (
              <Ionicons
                name={badge.icon}
                size={11}
                color={
                  badge.color.includes('rose')
                    ? '#be123c'
                    : badge.color.includes('blue')
                    ? '#1d4ed8'
                    : badge.color.includes('purple')
                    ? '#6d28d9'
                    : '#047857'
                }
                style={{ marginRight: 3 }}
              />
            )}
            <Text className={`text-[10px] font-bold ${badge.color}`}>{badge.label}</Text>
          </View>
        )}
      </View>

      {/* Nội dung thông tin */}
      <View className="p-3.5 flex-1 justify-between">
        <View>
          <View style={{ minHeight: 40, justifyContent: 'flex-start' }}>
            <Text numberOfLines={2} className="text-sm font-extrabold text-slate-900 leading-snug">
              {name}
            </Text>
          </View>

          <View style={{ minHeight: 34, justifyContent: 'flex-start', marginTop: 3 }}>
            <Text numberOfLines={2} className="text-xs text-slate-500 leading-relaxed">
              {description || (specialtyName ? `Chuyên khoa ${specialtyName}` : 'Tầm soát sức khỏe chuyên sâu')}
            </Text>
          </View>
        </View>

        {/* Giá & Nút đặt khám */}
        <View className="mt-3 pt-2.5 border-t border-slate-100">
          <View className="flex-row items-center justify-between mb-2.5">
            <Text className="text-xs text-slate-400 font-medium">
              {specialtyName || 'Chi phí trọn gói'}
            </Text>
            <Text className="text-sm font-bold text-slate-800">{formatCurrencyVi(price)}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            className="w-full bg-emerald-700 active:bg-emerald-800 py-2.5 rounded-lg items-center justify-center shadow-2xs"
          >
            <Text className="text-xs font-bold text-white">Đặt khám ngay</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
