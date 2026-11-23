import Ionicons from '@expo/vector-icons/Ionicons'

export type BookingMethod =
  | 'SPECIALTY_EXAM'
  | 'CONSULTATION'
  | 'ONLINE_CONSULTATION'
  | 'FOLLOWUP_EXAM'
  | 'FAMILY_BOOKING'
  | 'AFTER_HOURS'
  | 'HEALTH_PACKAGE'

export interface MethodInfoItem {
  title: string
  badge: string
  desc: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bgColor: string
}

export const METHOD_INFO: Record<BookingMethod, MethodInfoItem> = {
  SPECIALTY_EXAM: {
    title: 'Khám Chuyên Khoa',
    badge: 'Phổ biến',
    desc: 'Hơn 12 chuyên khoa mũi nhọn (Tim mạch, Mắt, Nhi, Da liễu...)',
    icon: 'medkit-outline',
    color: '#28a745',
    bgColor: 'bg-primary-50',
  },
  CONSULTATION: {
    title: 'Khám Cùng Bác Sĩ',
    badge: 'Chuyên gia',
    desc: 'Chủ động chọn bác sĩ CKI - CKII theo học vị & chuyên môn',
    icon: 'person-outline',
    color: '#1d4ed8',
    bgColor: 'bg-blue-50',
  },
  ONLINE_CONSULTATION: {
    title: 'Tư Vấn Online',
    badge: 'Telehealth 24/7',
    desc: 'Gọi video 1:1 cùng bác sĩ, đọc kết quả xét nghiệm từ xa',
    icon: 'videocam-outline',
    color: '#0f766e',
    bgColor: 'bg-teal-50',
  },
  FOLLOWUP_EXAM: {
    title: 'Tái Khám',
    badge: 'Theo hẹn',
    desc: 'Đặt lịch tái khám với bác sĩ đã điều trị để theo dõi sức khỏe',
    icon: 'repeat-outline',
    color: '#e11d48',
    bgColor: 'bg-rose-50',
  },
  FAMILY_BOOKING: {
    title: 'Khám Gia Đình',
    badge: 'Gia đình',
    desc: 'Chăm sóc ông bà, cha mẹ và con nhỏ trên cùng một tài khoản',
    icon: 'people-outline',
    color: '#7c3aed',
    bgColor: 'bg-purple-50',
  },
  AFTER_HOURS: {
    title: 'Khám Ngoài Giờ',
    badge: '17:00 - 20:30',
    desc: 'Khung giờ tối 17:00 - 20:30 tiện lợi cho người bận rộn',
    icon: 'time-outline',
    color: '#b45309',
    bgColor: 'bg-amber-50',
  },
  HEALTH_PACKAGE: {
    title: 'Gói Khám Sức Khỏe',
    badge: 'Toàn diện',
    desc: 'Tầm soát chuyên sâu và xét nghiệm tổng quát định kỳ',
    icon: 'shield-checkmark-outline',
    color: '#28a745',
    bgColor: 'bg-primary-50',
  },
}
