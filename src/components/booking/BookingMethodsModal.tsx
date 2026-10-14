import React, { useMemo } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { doctorService } from '../../services/doctorService'

interface BookingMethodsModalProps {
  visible: boolean
  onClose: () => void
}

interface MethodMeta {
  id: string
  title: string
  desc: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bgColor: string
  borderColor: string
  path: string
}

import { useBookingStore } from '../../store/useBookingStore'

// Bảng màu Y tế tự nhiên, tinh tế, êm mắt
const METHOD_CONFIGS: Record<string, Omit<MethodMeta, 'id' | 'title' | 'desc'>> = {
  SPECIALTY_EXAM: {
    icon: 'medkit-outline',
    color: '#28a745',
    bgColor: '#f0faf2',
    borderColor: '#d9f2df',
    path: '/booking/specialty',
  },
  CONSULTATION: {
    icon: 'person-outline',
    color: '#1d4ed8',
    bgColor: '#eff6ff',
    borderColor: '#dbeafe',
    path: '/booking/doctor',
  },
  ONLINE_CONSULTATION: {
    icon: 'videocam-outline',
    color: '#0f766e',
    bgColor: '#f0fdfa',
    borderColor: '#ccfbf1',
    path: '/booking/online',
  },
  FOLLOWUP_EXAM: {
    icon: 'repeat-outline',
    color: '#e11d48',
    bgColor: '#fff1f2',
    borderColor: '#ffe4e6',
    path: '/booking/doctor?flow=followup',
  },
  FAMILY_BOOKING: {
    icon: 'people-outline',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ede9fe',
    path: '/booking/specialty?flow=family',
  },
  AFTER_HOURS: {
    icon: 'time-outline',
    color: '#b45309',
    bgColor: '#fefce8',
    borderColor: '#fef08a',
    path: '/booking/after-hours',
  },
  HEALTH_PACKAGE: {
    icon: 'shield-checkmark-outline',
    color: '#28a745',
    bgColor: '#f0faf2',
    borderColor: '#d9f2df',
    path: '/booking/package',
  },
}

// Dữ liệu dự phòng đồng bộ 6 danh mục phương thức khám chuẩn từ backend
const FALLBACK_METHODS: MethodMeta[] = [
  {
    id: 'specialty',
    title: 'Khám Chuyên Khoa',
    desc: 'Hơn 12 chuyên khoa mũi nhọn (Tim mạch, Mắt, Nhi, Da liễu...)',
    ...METHOD_CONFIGS.SPECIALTY_EXAM,
  },
  {
    id: 'doctor',
    title: 'Khám Cùng Bác Sĩ',
    desc: 'Chủ động chọn bác sĩ CKI - CKII theo học hàm và kinh nghiệm',
    ...METHOD_CONFIGS.CONSULTATION,
  },
  {
    id: 'online',
    title: 'Tư Vấn Online',
    desc: 'Gọi video 1:1 cùng bác sĩ, đọc kết quả xét nghiệm từ xa',
    ...METHOD_CONFIGS.ONLINE_CONSULTATION,
  },
  {
    id: 'followup',
    title: 'Tái Khám',
    desc: 'Đặt lịch tái khám với bác sĩ đã điều trị để theo dõi sức khỏe định kỳ',
    ...METHOD_CONFIGS.FOLLOWUP_EXAM,
  },
  {
    id: 'family',
    title: 'Khám Gia Đình',
    desc: 'Chăm sóc ông bà, cha mẹ và con nhỏ trên cùng một tài khoản',
    ...METHOD_CONFIGS.FAMILY_BOOKING,
  },
  {
    id: 'after-hours',
    title: 'Khám Ngoài Giờ',
    desc: '17:30 - 20:30 tiện lợi cho người bận rộn, không lo chờ đợi',
    ...METHOD_CONFIGS.AFTER_HOURS,
  },
]

export const BookingMethodsModal: React.FC<BookingMethodsModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter()
  const { setBookingMethod, setIsAfterHours, resetBooking } = useBookingStore()

  // Gắn API backend: lấy danh mục hình thức khám thực tế đang bật tại phòng khám
  const { data: apiMethods = [], isLoading } = useQuery({
    queryKey: ['bookingMethods'],
    queryFn: () => doctorService.getBookingMethods(),
    enabled: visible,
    staleTime: 1000 * 60 * 10,
  })

  // Ánh xạ dữ liệu từ backend API với cấu hình icon clean, không chứa tag
  const methods = useMemo<MethodMeta[]>(() => {
    if (!apiMethods || apiMethods.length === 0) {
      return FALLBACK_METHODS
    }

    return apiMethods.map((item: any) => {
      const typeKey = String(item.type || item.code || '').toUpperCase()
      const cfg = METHOD_CONFIGS[typeKey] || METHOD_CONFIGS.SPECIALTY_EXAM

      return {
        id: String(item.id || item.code || item.bookingMethodId || typeKey),
        title: item.displayName || item.name || 'Hình thức khám bệnh',
        desc: item.description || 'Dịch vụ thăm khám sức khỏe chất lượng cao tại VitaCare',
        icon: cfg.icon,
        color: cfg.color,
        bgColor: cfg.bgColor,
        borderColor: cfg.borderColor,
        path: cfg.path,
      }
    })
  }, [apiMethods])

  const handleSelectMethod = (item: MethodMeta) => {
    onClose()
    setTimeout(() => {
      const path = item.path
      const id = item.id.toLowerCase()
      resetBooking()

      if (path.includes('specialty') || id.includes('specialty')) {
        setBookingMethod('SPECIALTY_EXAM')
        setIsAfterHours(false)
        router.push('/booking?method=specialty')
      } else if (path.includes('doctor') || id.includes('consultation') || id.includes('doctor')) {
        setBookingMethod('CONSULTATION')
        setIsAfterHours(false)
        router.push('/booking?method=doctor')
      } else if (path.includes('online') || id.includes('online')) {
        setBookingMethod('ONLINE_CONSULTATION')
        setIsAfterHours(false)
        router.push('/booking?method=online')
      } else if (path.includes('followup') || id.includes('followup')) {
        setBookingMethod('FOLLOWUP_EXAM')
        setIsAfterHours(false)
        router.push('/booking?method=followup')
      } else if (path.includes('family') || id.includes('family')) {
        setBookingMethod('FAMILY_BOOKING')
        setIsAfterHours(false)
        router.push('/booking?method=family')
      } else if (path.includes('package') || id.includes('package')) {
        setBookingMethod('HEALTH_PACKAGE')
        setIsAfterHours(false)
        router.push('/booking?method=package')
      } else if (path.includes('after-hours') || id.includes('after-hours')) {
        setBookingMethod('AFTER_HOURS')
        setIsAfterHours(true)
        router.push('/booking?mode=after-hours' as any)
      } else {
        setBookingMethod('SPECIALTY_EXAM')
        setIsAfterHours(false)
        router.push('/booking?method=specialty')
      }
    }, 150)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 bg-slate-900/60 justify-end"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="bg-white rounded-t-2xl p-5 pb-8 border-t border-slate-100 shadow-2xl"
        >
          {/* Thanh gạt trên đỉnh */}
          <View className="w-12 h-1.5 rounded-full bg-slate-200 self-center mb-3.5" />

          {/* Tiêu đề & Nút đóng */}
          <View className="flex-row items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <View>
              <Text className="text-lg font-black text-slate-900 tracking-tight">
                Phương thức đặt lịch khám
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                Dữ liệu hình thức khám chính thức kết nối từ phòng khám VitaCare
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Danh sách các phương thức từ API */}
          {isLoading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="small" color="#28a745" />
              <Text className="text-xs text-slate-400 mt-2 font-medium">
                Đang tải danh mục khám bệnh...
              </Text>
            </View>
          ) : (
            <View className="gap-2.5">
              {methods.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.75}
                  onPress={() => handleSelectMethod(item)}
                  className="flex-row items-center p-3.5 rounded-lg bg-white border border-slate-200/90 shadow-2xs active:bg-slate-50"
                >
                  {/* Icon clean với nền pastel tự nhiên chuẩn y tế như mẫu Thông báo */}
                  <View
                    style={{
                      backgroundColor: item.bgColor,
                      borderColor: item.borderColor,
                    }}
                    className="w-11 h-11 rounded-lg items-center justify-center mr-3.5 shrink-0 border"
                  >
                    <Ionicons name={item.icon} size={21} color={item.color} />
                  </View>

                  {/* Tiêu đề và mô tả (đã bỏ toàn bộ tag ở góc phải) */}
                  <View className="flex-1 pr-2">
                    <Text
                      numberOfLines={1}
                      className="text-sm font-extrabold text-slate-800"
                    >
                      {item.title}
                    </Text>
                    <Text numberOfLines={2} className="text-xs text-slate-500 mt-1 leading-snug">
                      {item.desc}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
