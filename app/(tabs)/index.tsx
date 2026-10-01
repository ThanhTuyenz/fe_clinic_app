import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useBookingStore } from '../../src/store/useBookingStore'
import { doctorService } from '../../src/services/doctorService'
import { Doctor } from '../../src/types/doctor'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { BookingMethodsModal } from '../../src/components/booking/BookingMethodsModal'
import { formatCurrencyVi } from '../../src/utils/date'

// 1. Danh mục 6 phương thức khám bệnh đồng bộ chuẩn từ Web & Backend
const BOOKING_METHODS = [
  {
    id: 'specialty',
    code: 'SPECIALTY_EXAM',
    name: 'Khám chuyên khoa',
    image: 'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=300&q=80',
    color: '#059669',
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

// 2. Gói khám sức khỏe & chuyên khoa (Đồng bộ phân loại màu sắc từ Web)
const HEALTH_PACKAGES = [
  {
    id: 'pkg-1',
    category: 'TỔNG QUÁT',
    name: 'Khám Sức Khỏe Định Kỳ Toàn Diện',
    desc: 'Xét nghiệm máu, đường huyết, X-quang phổi và tư vấn bác sĩ chuyên khoa',
    price: 1500000,
    tag: 'PHỔ BIẾN',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
    color: '#059669',
    bgColor: 'bg-emerald-50',
    tagBg: 'bg-emerald-50 border-emerald-200',
    tagColor: 'text-emerald-700',
    categoryColor: 'text-emerald-700',
  },
  {
    id: 'pkg-2',
    category: 'TIM MẠCH',
    name: 'Tầm Soát Tim Mạch & Huyết Áp',
    desc: 'Đo điện tim ECG, siêu âm Doppler tim và hội chẩn cùng bác sĩ tim mạch',
    price: 1850000,
    tag: 'CHUYÊN SÂU',
    image: 'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=600&auto=format&fit=crop&q=80',
    color: '#e11d48',
    bgColor: 'bg-rose-50',
    tagBg: 'bg-rose-50 border-rose-200',
    tagColor: 'text-rose-700',
    categoryColor: 'text-rose-600',
  },
  {
    id: 'pkg-3',
    category: 'NHI KHOA',
    name: 'Gói Kiểm Tra Dinh Dưỡng Cho Bé',
    desc: 'Đánh giá vi chất, tăng trưởng chiều cao, tầm soát hô hấp và tiêm chủng',
    price: 850000,
    tag: 'TIÊU CHUẨN',
    image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80',
    color: '#d97706',
    bgColor: 'bg-amber-50',
    tagBg: 'bg-amber-50 border-amber-200',
    tagColor: 'text-amber-700',
    categoryColor: 'text-amber-600',
  },
  {
    id: 'pkg-4',
    category: 'XƯƠNG KHỚP',
    name: 'Tầm Soát Thoát Vị & Cột Sống',
    desc: 'Kiểm tra thoái hóa, phục hồi chức năng và tư vấn tư thế làm việc',
    price: 1200000,
    tag: 'VĂN PHÒNG',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
    color: '#0284c7',
    bgColor: 'bg-sky-50',
    tagBg: 'bg-sky-50 border-sky-200',
    tagColor: 'text-sky-700',
    categoryColor: 'text-sky-600',
  },
]

// 3. Cơ sở y tế nổi bật (Đồng bộ từ Web)
const FACILITIES = [
  {
    id: 'branch-1',
    name: 'VitaCare Clinic - Cơ sở Quận 1',
    address: '85 Cách Mạng Tháng 8, P. Bến Thành, Quận 1, TP.HCM',
    phone: '1900 1234 (Ext 1)',
    tag: 'TRỤ SỞ CHÍNH',
    rating: '5.0',
    img: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'branch-2',
    name: 'VitaCare Clinic - Cơ sở Cầu Giấy',
    address: '120 Xuân Thủy, Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
    phone: '1900 1234 (Ext 2)',
    tag: 'CÔNG NGHỆ CAO',
    rating: '4.9',
    img: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'branch-3',
    name: 'VitaCare Clinic - Cơ sở Đà Nẵng',
    address: '15 Lê Lợi, P. Thạch Thang, Q. Hải Châu, Đà Nẵng',
    phone: '1900 1234 (Ext 3)',
    tag: 'ĐA KHOA QUỐC TẾ',
    rating: '4.9',
    img: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80',
  },
]

// 4. Thống kê năng lực phòng khám
const CLINIC_STATS = [
  { value: '50+', label: 'Bác sĩ chuyên khoa', icon: 'people-outline' as const },
  { value: '15+', label: 'Chuyên khoa', icon: 'medkit-outline' as const },
  { value: '03', label: 'Cơ sở hiện đại', icon: 'business-outline' as const },
  { value: '4.9★', label: 'Hài lòng', icon: 'star-outline' as const },
]

// 5. Kiến thức y khoa & Tin tức mới nhất (Đồng bộ từ Web)
const MEDICAL_NEWS = [
  {
    id: 'news-1',
    category: 'CÔNG NGHỆ Y TẾ',
    title: 'Ứng dụng AI trong chẩn đoán sớm và tư vấn sức khỏe trực tuyến tại VitaCare',
    date: 'Hôm nay',
    views: '1.2k lượt xem',
    img: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'news-2',
    category: 'TIM MẠCH',
    title: '5 dấu hiệu cảnh báo bệnh lý tim mạch sớm mà người trẻ thường bỏ qua',
    date: 'Hôm qua',
    views: '850 lượt xem',
    img: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'news-3',
    category: 'DINH DƯỠNG',
    title: 'Chế độ ăn khoa học giúp tăng cường miễn dịch và bảo vệ đường tiêu hóa',
    date: '3 ngày trước',
    views: '2.1k lượt xem',
    img: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=600&auto=format&fit=crop&q=80',
  },
]

export default function HomeScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const setDoctor = useBookingStore((state) => state.setDoctor)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<string>('specialty')
  const [bookingModalVisible, setBookingModalVisible] = useState(false)

  const {
    data: doctors = [],
    isLoading: loadingDoctors,
    refetch: refetchDoctors,
    isRefetching,
  } = useQuery({
    queryKey: ['doctors'],
    queryFn: () => doctorService.getDoctors(),
  })

  const { refetch: refetchDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: () => doctorService.getDepartments(),
  })

  const handleSelectDoctor = (doc: Doctor) => {
    setDoctor(doc)
    router.push(`/booking?doctorId=${doc.id}` as any)
  }

  const handleStartBooking = () => {
    setBookingModalVisible(true)
  }

  const patientName = user?.full_name || user?.fullName || user?.name || 'Quý khách'

  const filteredDoctors = doctors.filter((doc) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const name = (doc.full_name || doc.fullName || doc.name || '').toLowerCase()
    const spec = (typeof doc.specialty === 'object' ? doc.specialty?.name : doc.specialty || '').toLowerCase()
    return name.includes(q) || spec.includes(q)
  })

  return (
    <ScreenShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            tintColor="#059669"
            colors={['#059669']}
            onRefresh={() => {
              refetchDoctors()
              refetchDepts()
            }}
          />
        }
      >
        {/* ================= SECTION 1: HEADER THƯƠNG HIỆU ================= */}
        <View className="bg-white px-5 pt-3 pb-3 border-b border-slate-100 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <View className="flex-row items-center">
              <Image
                source={require('../../assets/images/logo-icon.png')}
                style={{ width: 32, height: 32 }}
                contentFit="contain"
                transition={200}
              />
              <View className="ml-2 flex-row items-baseline">
                <Text className="text-base font-black text-slate-800 tracking-tight">
                  Vita<Text className="text-emerald-700">Care</Text>
                </Text>
                <Text className="text-[10px] font-bold text-emerald-600 tracking-wider uppercase ml-1.5">
                  CLINIC
                </Text>
              </View>
            </View>
            <Text numberOfLines={1} className="text-xs font-medium text-slate-500 mt-1">
              Xin chào, {patientName}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/notifications')}
              className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 items-center justify-center relative shadow-2xs"
            >
              <Ionicons name="notifications-outline" size={20} color="#1e293b" />
              <View className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-2 right-2 border-2 border-white" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/ai-chat')}
              className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 items-center justify-center relative shadow-2xs"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#1e293b" />
              <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute top-2 right-2 border-2 border-white" />
            </TouchableOpacity>

            {!isAuthenticated && (
              <TouchableOpacity
                onPress={() => router.push('/(auth)/login')}
                className="bg-emerald-600 px-3.5 py-2 rounded-lg ml-1 shadow-xs"
              >
                <Text className="text-white text-xs font-bold">Đăng nhập</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ================= THANH TÌM KIẾM ================= */}
        <View className="bg-white px-5 pt-2 pb-3 border-b border-slate-100">
          <View className="flex-row items-center bg-slate-50 border border-slate-200/90 rounded-lg px-3.5 py-2 shadow-2xs">
            <Ionicons name="search-outline" size={17} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Tìm bác sĩ, chuyên khoa, gói khám..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-xs text-slate-800 p-0 outline-none"
              style={[{ outlineWidth: 0, outlineStyle: 'none' } as any]}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => router.push({ pathname: '/booking', params: { method: 'doctor' } })}>
                <View className="w-6 h-6 rounded-md bg-emerald-50 items-center justify-center">
                  <Ionicons name="filter-outline" size={13} color="#059669" />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ================= SECTION 2: HERO BANNER ĐẶT KHÁM ================= */}
        <View className="px-5 pt-3">
          <View className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-emerald-600 rounded-lg px-4 py-3 shadow-xs relative overflow-hidden">
            <View pointerEvents="none" className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/10" />
            <View pointerEvents="none" className="absolute -bottom-8 right-24 w-20 h-20 rounded-full bg-teal-300/20" />

            <View className="flex-row items-end justify-between">
              <View className="w-24 h-28 items-center justify-end -mb-3 -ml-1 mr-2">
                <Image
                  source={require('../../assets/images/doctor-hero.png')}
                  style={{ width: 105, height: 122 }}
                  contentFit="contain"
                  contentPosition="bottom center"
                  transition={200}
                />
              </View>

              <View className="flex-1 pl-1 pb-0.5">
                <Text className="text-white text-[15px] font-black tracking-tight leading-tight">
                  Khám bệnh online!
                </Text>
                <Text className="text-emerald-50 text-[11px] mt-1 leading-tight">
                  Chủ động chọn bác sĩ & giờ khám không lo xếp hàng chờ đợi
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleStartBooking}
                  className="bg-white mt-2 py-1.5 px-3 rounded-md self-start flex-row items-center shadow-xs"
                >
                  <Text className="text-emerald-800 font-extrabold text-[11px] mr-1">
                    Đặt lịch ngay
                  </Text>
                  <Ionicons name="arrow-forward" size={12} color="#047857" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* ================= SECTION 3: CÁC PHƯƠNG THỨC KHÁM BỆNH ================= */}
        <View className="pt-6">
          <View className="px-5 flex-row items-center justify-between mb-3.5">
            <View>
              <Text className="text-base font-extrabold text-slate-900 tracking-tight">
                Phương thức khám bệnh
              </Text>
            </View>
            <TouchableOpacity onPress={() => setBookingModalVisible(true)}>
              <Text className="text-xs font-semibold text-emerald-600">Xem tất cả</Text>
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
                  onPress={() => {
                    setSelectedMethod(method.id)
                    const store = useBookingStore.getState()
                    store.resetBooking()
                    store.setBookingMethod(method.code as any)
                    if (method.id === 'after-hours') {
                      store.setIsAfterHours(true)
                    }
                    router.push(method.path as any)
                  }}
                  className={`mr-2.5 px-4 py-2 rounded-lg border transition-all ${isSelected
                      ? 'border-emerald-300'
                      : 'border-slate-200/90'
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
                    className={`text-xs ${isSelected
                        ? 'text-emerald-700 font-bold'
                        : 'text-slate-600 font-medium'
                      }`}
                  >
                    {method.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* ================= SECTION 4: GÓI KHÁM SỨC KHỎE & CHUYÊN KHOA ================= */}
        <View className="mt-8 pt-2" style={{ marginTop: 32 }}>
          <View className="px-5 flex-row items-center justify-between mb-3.5">
            <View>
              <Text className="text-base font-extrabold text-slate-900 tracking-tight">
                Gói khám sức khỏe toàn diện
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push({ pathname: '/booking', params: { method: 'package' } })}>
              <Text className="text-xs font-semibold text-emerald-600">Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {HEALTH_PACKAGES.map((pkg) => (
              <View
                key={pkg.id}
                className="w-64 bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden mr-3.5 justify-between"
              >
                {/* Ảnh bìa hình chữ nhật (h-32) sạch sẽ không nhãn */}
                <View className="h-32 w-full bg-slate-100 relative">
                  <Image
                    source={{ uri: pkg.image }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={200}
                  />
                </View>

                {/* Nội dung thông tin gói */}
                <View className="p-3.5 flex-1 justify-between">
                  {/* Khung tiêu đề & mô tả cố định chiều cao tối thiểu để các card đồng đều */}
                  <View>
                    <View style={{ minHeight: 42, justifyContent: 'flex-start' }}>
                      <Text
                        numberOfLines={2}
                        className="text-sm font-extrabold text-slate-900 leading-snug"
                      >
                        {pkg.name}
                      </Text>
                    </View>

                    <View style={{ minHeight: 36, justifyContent: 'flex-start', marginTop: 4 }}>
                      <Text
                        numberOfLines={2}
                        className="text-xs text-slate-500 leading-relaxed"
                      >
                        {pkg.desc}
                      </Text>
                    </View>
                  </View>

                  {/* Phần giá & nút bấm luôn neo cố định tại đáy card, thẳng hàng 100% giữa tất cả các card */}
                  <View className="mt-3 pt-2.5 border-t border-slate-100">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-xs text-slate-400 font-medium">Chi phí trọn gói</Text>
                      <Text className="text-sm font-semibold text-slate-800">
                        {formatCurrencyVi(pkg.price)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        const store = useBookingStore.getState()
                        store.resetBooking()
                        store.setBookingMethod('HEALTH_PACKAGE')
                        router.push(`/booking?packageId=${pkg.id}&method=package` as any)
                      }}
                      className="w-full bg-emerald-700 active:bg-emerald-800 py-2.5 rounded-lg items-center justify-center shadow-2xs"
                    >
                      <Text className="text-xs font-bold text-white">Đặt khám ngay</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ================= SECTION 5: BÁC SĨ CHUYÊN KHOA TIÊU BIỂU ================= */}
        <View className="mt-8 pt-2" style={{ marginTop: 32 }}>
          <View className="px-5 flex-row items-center justify-between mb-3.5">
            <View>
              <Text className="text-base font-extrabold text-slate-900 tracking-tight">
                Đội ngũ bác sĩ tiêu biểu
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/booking')}>
              <Text className="text-xs font-semibold text-emerald-600">Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {loadingDoctors ? (
            <ActivityIndicator size="small" color="#059669" className="py-8" />
          ) : filteredDoctors.length === 0 ? (
            <View className="bg-white mx-5 p-6 rounded-lg border border-slate-100 items-center justify-center">
              <Ionicons name="medical-outline" size={32} color="#cbd5e1" />
              <Text className="text-slate-400 text-xs text-center mt-2 font-medium">
                {searchQuery ? 'Không tìm thấy bác sĩ phù hợp với từ khóa' : 'Chưa có dữ liệu bác sĩ'}
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {filteredDoctors.slice(0, 8).map((doc) => {
                const docName = (doc.full_name || doc.fullName || doc.name || 'Bác sĩ').trim()
                const docSpecialty =
                  typeof doc.specialty === 'object'
                    ? doc.specialty?.name
                    : doc.specialty || doc.specialty_name || 'Đa khoa'

                // Làm sạch học vị, tránh lỗi lặp "Bác sĩ CKI BS. CKI"
                let displayName = docName
                if (/^(bác sĩ|bs\.?)/i.test(displayName)) {
                  displayName = displayName.replace(/^(bác sĩ|bs\.?)\s*(cki|ckii)?\s*(bác sĩ|bs\.?)\s*(cki|ckii)?/gi, 'BS. $2 $4').trim()
                } else if (doc.title) {
                  displayName = `${doc.title} ${displayName}`
                } else {
                  displayName = `BS. ${displayName}`
                }

                const fee = doc.consultation_fee || doc.price || 300000

                return (
                  <View
                    key={doc.id}
                    className="w-64 bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden mr-3.5 justify-between"
                  >
                    {/* Ảnh bìa bác sĩ tràn viền đồng bộ với card Gói khám */}
                    <View className="h-32 w-full bg-slate-100 relative">
                      <Image
                        source={{ uri: doc.avatar }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                      />
                    </View>

                    {/* Nội dung thông tin bác sĩ */}
                    <View className="p-3.5 flex-1 justify-between">
                      {/* Khung tên & chuyên khoa cố định chiều cao tối thiểu để các card đồng đều */}
                      <View>
                        <View style={{ minHeight: 42, justifyContent: 'flex-start' }}>
                          <Text
                            numberOfLines={2}
                            className="text-sm font-extrabold text-slate-900 leading-snug"
                          >
                            {displayName}
                          </Text>
                        </View>

                        <View style={{ minHeight: 36, justifyContent: 'flex-start', marginTop: 4 }}>
                          <Text
                            numberOfLines={2}
                            className="text-xs text-slate-500 leading-relaxed"
                          >
                            Chuyên khoa {docSpecialty}{doc.experience_years ? ` • ${doc.experience_years} năm kinh nghiệm` : ''}
                          </Text>
                        </View>
                      </View>

                      {/* Phần giá & nút bấm luôn neo cố định tại đáy card, thẳng hàng 100% */}
                      <View className="mt-3 pt-2.5 border-t border-slate-100">
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center">
                            <Ionicons name="star" size={13} color="#f59e0b" />
                            <Text className="text-xs font-bold text-slate-700 ml-1">
                              {doc.rating || 5.0}
                            </Text>
                            <Text className="text-xs text-slate-400 font-medium ml-1.5">• Giá khám</Text>
                          </View>
                          <Text className="text-sm font-semibold text-slate-800">
                            {formatCurrencyVi(fee)}
                          </Text>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleSelectDoctor(doc)}
                          className="w-full bg-emerald-700 active:bg-emerald-800 py-2.5 rounded-lg items-center justify-center shadow-2xs"
                        >
                          <Text className="text-xs font-bold text-white">Đặt khám ngay</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )
              })}
            </ScrollView>
          )}
        </View>

        {/* ================= SECTION 6: CƠ SỞ Y TẾ NỔI BẬT (MẠNG LƯỚI TIN CẬY) ================= */}
        <View className="mt-8 pt-2" style={{ marginTop: 32 }}>
          <View className="px-5 flex-row items-center justify-between mb-3.5">
            <View>
              <Text className="text-base font-extrabold text-slate-900 tracking-tight">
                Cơ sở y tế nổi bật
              </Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Hệ thống cơ sở', 'VitaCare hiện có 3 cơ sở chính tại TP.HCM, Hà Nội và Đà Nẵng.')}>
              <Text className="text-xs font-semibold text-emerald-600">Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {FACILITIES.map((facility) => (
              <View
                key={facility.id}
                className="w-64 bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden mr-3.5"
              >
                <View className="h-32 relative bg-slate-100">
                  <Image
                    source={{ uri: facility.img }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                  <View className="absolute top-2.5 left-2.5 bg-emerald-700 px-2 py-0.5 rounded-lg shadow-xs">
                    <Text className="text-white text-[9px] font-bold uppercase tracking-wider">
                      {facility.tag}
                    </Text>
                  </View>
                  <View className="absolute bottom-2 right-2 bg-black/60 px-2 py-0.5 rounded-lg flex-row items-center">
                    <Ionicons name="star" size={11} color="#f59e0b" />
                    <Text className="text-white text-[10px] font-bold ml-1">{facility.rating}</Text>
                  </View>
                </View>

                <View className="p-3.5">
                  <Text numberOfLines={1} className="text-sm font-bold text-slate-900">
                    {facility.name}
                  </Text>
                  <View className="flex-row items-start mt-1.5">
                    <Ionicons name="location-outline" size={13} color="#059669" style={{ marginTop: 1, marginRight: 4 }} />
                    <Text numberOfLines={2} className="text-xs text-slate-500 flex-1 leading-snug">
                      {facility.address}
                    </Text>
                  </View>
                  <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                    <Text className="text-[11px] text-emerald-700 font-semibold">{facility.phone}</Text>
                    <TouchableOpacity
                      onPress={handleStartBooking}
                      className="bg-emerald-50 border border-emerald-600 px-2.5 py-1 rounded-lg"
                    >
                      <Text className="text-[10px] font-bold text-emerald-700">Đặt khám</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ================= SECTION 7: THỐNG KÊ NĂNG LỰC PHÒNG KHÁM ================= */}
        <View className="px-5 pt-8">
          <View className="bg-emerald-50/50 border border-emerald-100/90 rounded-lg p-4 shadow-2xs">
            <View className="flex-row items-center justify-between mb-3 pb-2 border-b border-emerald-100/60">
              <Text className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Năng Lực Y Tế VitaCare
              </Text>
              <Text className="text-[11px] font-medium text-emerald-600">Hệ thống chất lượng cao</Text>
            </View>
            <View className="flex-row justify-between items-center">
              {CLINIC_STATS.map((stat, i) => (
                <View key={i} className="items-center flex-1">
                  <Text className="text-lg font-black text-emerald-800">{stat.value}</Text>
                  <Text className="text-[10px] font-bold text-slate-600 text-center mt-0.5">
                    {stat.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* ================= SECTION 8: KIẾN THỨC Y KHOA MỚI NHẤT ================= */}
        <View className="mt-8 pt-2 px-5" style={{ marginTop: 32 }}>
          <View className="flex-row items-center justify-between mb-3.5">
            <View>
              <Text className="text-base font-extrabold text-slate-900 tracking-tight">
                Kiến thức y khoa mới nhất
              </Text>
            </View>
            <TouchableOpacity onPress={() => Alert.alert('Cẩm nang sức khỏe', 'Chuyên mục tin tức y khoa cập nhật mỗi ngày.')}>
              <Text className="text-xs font-semibold text-emerald-600">Xem thêm</Text>
            </TouchableOpacity>
          </View>

          {/* Tin nổi bật to */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => Alert.alert('Chi tiết bài viết', MEDICAL_NEWS[0].title)}
            className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden mb-3"
          >
            <View className="h-36 relative bg-slate-100">
              <Image
                source={{ uri: MEDICAL_NEWS[0].img }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
              <View className="absolute top-2.5 left-2.5 bg-emerald-700 px-2 py-0.5 rounded-lg shadow-xs">
                <Text className="text-white text-[9px] font-bold uppercase tracking-wider">
                  {MEDICAL_NEWS[0].category}
                </Text>
              </View>
            </View>
            <View className="p-3.5">
              <Text numberOfLines={2} className="text-sm font-bold text-slate-900 leading-snug">
                {MEDICAL_NEWS[0].title}
              </Text>
              <View className="flex-row items-center mt-2 text-slate-400">
                <Text className="text-[11px] text-slate-400">{MEDICAL_NEWS[0].date}</Text>
                <Text className="text-[11px] text-slate-300 mx-1.5">•</Text>
                <Text className="text-[11px] text-slate-400">{MEDICAL_NEWS[0].views}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* 2 bài viết dạng danh sách phẳng */}
          <View className="gap-2.5">
            {MEDICAL_NEWS.slice(1).map((news) => (
              <TouchableOpacity
                key={news.id}
                activeOpacity={0.8}
                onPress={() => Alert.alert('Chi tiết bài viết', news.title)}
                className="flex-row items-center p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-2xs"
              >
                <View className="w-18 h-18 rounded-lg overflow-hidden bg-slate-100 mr-3">
                  <Image
                    source={{ uri: news.img }}
                    style={{ width: 72, height: 72 }}
                    contentFit="cover"
                  />
                </View>
                <View className="flex-1 pr-1">
                  <Text className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    {news.category}
                  </Text>
                  <Text numberOfLines={2} className="text-xs font-bold text-slate-900 mt-0.5 leading-snug">
                    {news.title}
                  </Text>
                  <Text className="text-[10px] text-slate-400 mt-1">{news.date} • {news.views}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal Phương thức Đặt lịch */}
      <BookingMethodsModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
      />
    </ScreenShell>
  )
}
