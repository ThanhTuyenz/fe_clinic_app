import React, { useMemo, useState, useEffect } from 'react'
import {
  ActivityIndicator,
  Linking,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { doctorService } from '../../src/services/doctorService'
import { useBookingStore } from '../../src/store/useBookingStore'
import { useBehaviorTracker } from '../../src/hooks/useBehaviorTracker'
import { formatCurrencyVi } from '../../src/utils/date'
import { PackageCard } from '../../src/components/home/PackageCard'

const SPECIALTY_COVER_IMAGES: Record<string, string> = {
  tim_mach:
    'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=800&auto=format&fit=crop&q=80',
  tieu_hoa:
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
  co_xuong_khop:
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80',
  tong_quat:
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
  nhi_khoa:
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
  da_lieu:
    'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
}

const DEFAULT_COVER_IMAGES = [
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=800&auto=format&fit=crop&q=80',
]

const getPackageCoverImage = (
  name: string,
  specialtyName?: string,
  customImage?: string
): string => {
  if (customImage && customImage.trim()) return customImage
  const combined = (name + ' ' + (specialtyName || '')).toLowerCase()
  if (combined.includes('tim') || combined.includes('mạch') || combined.includes('huyết áp')) {
    return SPECIALTY_COVER_IMAGES.tim_mach
  }
  if (
    combined.includes('tiêu hóa') ||
    combined.includes('gan') ||
    combined.includes('mật') ||
    combined.includes('dạ dày')
  ) {
    return SPECIALTY_COVER_IMAGES.tieu_hoa
  }
  if (
    combined.includes('ngoại') ||
    combined.includes('chấn thương') ||
    combined.includes('khớp') ||
    combined.includes('xương')
  ) {
    return SPECIALTY_COVER_IMAGES.co_xuong_khop
  }
  if (combined.includes('nhi')) {
    return SPECIALTY_COVER_IMAGES.nhi_khoa
  }
  if (combined.includes('da') || combined.includes('liễu')) {
    return SPECIALTY_COVER_IMAGES.da_lieu
  }
  if (
    combined.includes('tổng quát') ||
    combined.includes('cơ bản') ||
    combined.includes('đa khoa')
  ) {
    return SPECIALTY_COVER_IMAGES.tong_quat
  }
  const hash = combined.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return DEFAULT_COVER_IMAGES[hash % DEFAULT_COVER_IMAGES.length]
}

const getSessionTypeLabel = (session?: string | null) => {
  switch (session) {
    case 'MORNING':
      return '07:30 - 11:30'
    case 'AFTERNOON':
      return '13:30 - 17:00'
    case 'OFFICE_HOURS':
      return '07:30 - 17:00'
    case 'ALL_DAY':
    default:
      return '07:00 - 20:00'
  }
}

export default function PackageDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [isSaved, setIsSaved] = useState(false)
  const { trackViewPackage } = useBehaviorTracker()

  const { data: pkg, isLoading, isError } = useQuery({
    queryKey: ['packageDetail', id],
    queryFn: () => doctorService.getPackageDetail(id!),
    enabled: Boolean(id),
  })

  // Telemetry: Ghi nhận sự kiện xem chi tiết gói khám (+2 điểm Intent)
  useEffect(() => {
    if (pkg && pkg.id) {
      void trackViewPackage(pkg.id, pkg.specialtyId || pkg.specialty?.id, {
        name: pkg.name,
        code: pkg.code,
        price: Number(pkg.price || 0),
        durationMin: pkg.durationMin,
        specialtyName: pkg.specialty?.name || pkg.specialtyName,
        description: pkg.description,
        image: pkg.imageUrl || pkg.image,
      })
    }
  }, [pkg, trackViewPackage])

  const { data: allPackages = [] } = useQuery({
    queryKey: ['healthPackages'],
    queryFn: () => doctorService.getHealthPackages(),
  })

  const specialtyName =
    pkg?.specialty?.name ||
    pkg?.specialtyName ||
    pkg?.category ||
    'Khám chuyên khoa'
  const name = pkg?.name || 'Gói khám sức khỏe'
  const price = pkg?.price ? Number(pkg.price) : 0
  const duration = pkg?.durationMin ? `${pkg.durationMin} phút` : '20 - 45 phút'
  const sessionType = getSessionTypeLabel(pkg?.sessionType)
  const coverImage = getPackageCoverImage(name, specialtyName, pkg?.imageUrl || pkg?.image)

  const symptoms: string[] = Array.isArray(pkg?.symptoms) ? pkg.symptoms : []
  const branches: any[] = Array.isArray(pkg?.branches) && pkg.branches.length > 0
    ? pkg.branches
    : pkg?.branch
      ? [pkg.branch]
      : [
        {
          id: 'b1',
          name: 'VitaCare Clinic - Cơ sở Quận 1',
          address: '120 Hai Bà Trưng, P. Đa Kao, Quận 1, TP. HCM',
        },
        {
          id: 'b2',
          name: 'VitaCare Clinic - Cơ sở Bình Thạnh',
          address: '45 Nguyễn Gia Trí, P. 25, Q. Bình Thạnh, TP. HCM',
        },
      ]

  const relatedPackages = useMemo(() => {
    if (!Array.isArray(allPackages) || allPackages.length === 0) return []
    return allPackages.filter(
      (p: any) => String(p.id) !== String(id) && p.slug !== id && p.name !== name
    )
  }, [allPackages, id, name])

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Khám phá gói khám "${name}" tại VitaCare Clinic. Chi phí trọn gói chỉ ${formatCurrencyVi(price)}!`,
      })
    } catch {
      // ignore
    }
  }

  const handleCallHotline = () => {
    Linking.openURL('tel:19006868').catch(() => { })
  }

  const handleBookNow = () => {
    const store = useBookingStore.getState()
    store.resetBooking()
    store.setBookingMethod('HEALTH_PACKAGE')
    if (pkg) {
      store.setHealthPackage({
        id: String(pkg.id || id),
        name: pkg.name || name,
        price: price,
        specialtyId: pkg.specialtyId || pkg.specialty?.id,
      })
    }
    router.push('/booking/package')
  }

  return (
    <ScreenShell
      showBackButton
      title="Chi tiết gói khám"
      rightElement={
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            onPress={() => setIsSaved(!isSaved)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-1.5 rounded-full active:bg-slate-100"
          >
            <Ionicons
              name={isSaved ? 'heart' : 'heart-outline'}
              size={22}
              color={isSaved ? '#e11d48' : '#475569'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-1.5 rounded-full active:bg-slate-100"
          >
            <Ionicons name="share-social-outline" size={21} color="#475569" />
          </TouchableOpacity>
        </View>
      }
    >
      <View className="flex-1 bg-white">
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="flex-1 bg-white"
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {isLoading ? (
            <View className="py-24 items-center justify-center">
              <ActivityIndicator size="large" color="#047857" />
              <Text className="text-xs text-slate-500 font-medium mt-3">
                Đang tải thông tin gói khám từ hệ thống...
              </Text>
            </View>
          ) : isError || !pkg ? (
            <View className="py-20 px-6 items-center justify-center text-center">
              <View className="w-12 h-12 rounded-full bg-rose-50 items-center justify-center mb-3">
                <Ionicons name="alert-circle-outline" size={28} color="#e11d48" />
              </View>
              <Text className="text-base font-bold text-slate-900 mb-1">
                Không tìm thấy gói khám
              </Text>
              <Text className="text-xs text-slate-500 text-center leading-relaxed mb-4">
                Gói dịch vụ có thể đã ngừng hoạt động hoặc định danh không chính xác.
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                className="bg-emerald-700 px-5 py-2.5 rounded-lg"
              >
                <Text className="text-xs font-bold text-white">Quay lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-white">
              {/* 1. Ảnh bìa & Tag chuyên khoa */}
              <View className="h-52 w-full bg-slate-100 relative">
                <Image
                  source={{ uri: coverImage }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={200}
                />
                <View className="absolute top-3 left-3 bg-emerald-700/90 backdrop-blur-md px-2.5 py-1 rounded-md">
                  <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                    {specialtyName}
                  </Text>
                </View>
              </View>

              {/* 2. Thân nội dung liền khối */}
              <View className="px-4 pt-4">
                {/* Tiêu đề & Giá tiền */}
                <Text className="text-lg font-bold text-slate-900 leading-snug">
                  {name}
                </Text>

                <View className="mt-2.5 flex-row items-baseline justify-between">
                  <View className="flex-row items-baseline">
                    <Text className="text-2xl font-extrabold text-emerald-800">
                      {formatCurrencyVi(price)}
                    </Text>
                    <Text className="text-[11px] text-slate-400 ml-2 font-normal">
                      (Đã gồm phí khám & tư vấn)
                    </Text>
                  </View>
                  <View className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <Text className="text-[11px] font-bold text-emerald-800">
                      Trọn gói
                    </Text>
                  </View>
                </View>

                {/* Hàng thông số tổng quan theo dạng dọc */}
                <View className="mt-3.5 bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="time-outline" size={15} color="#047857" style={{ marginRight: 8 }} />
                      <Text className="text-xs text-slate-500">Thời lượng khám:</Text>
                    </View>
                    <Text className="text-xs font-bold text-slate-800">{duration}</Text>
                  </View>

                  <View className="h-px bg-slate-200/50" />

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="calendar-outline" size={15} color="#047857" style={{ marginRight: 8 }} />
                      <Text className="text-xs text-slate-500">Khung giờ tiếp đón:</Text>
                    </View>
                    <Text className="text-xs font-bold text-slate-800">{sessionType}</Text>
                  </View>

                  <View className="h-px bg-slate-200/50" />

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="medkit-outline" size={15} color="#047857" style={{ marginRight: 8 }} />
                      <Text className="text-xs text-slate-500">Chuyên khoa:</Text>
                    </View>
                    <Text className="text-xs font-bold text-slate-800">{specialtyName}</Text>
                  </View>

                  <View className="h-px bg-slate-200/50" />

                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center mr-2">
                      <Ionicons name="business-outline" size={15} color="#047857" style={{ marginRight: 8, marginTop: 1 }} />
                      <Text className="text-xs text-slate-500">Cơ sở áp dụng:</Text>
                    </View>
                    <Text className="text-xs font-bold text-slate-800 flex-1 text-right leading-snug">
                      {branches.length > 1
                        ? `${branches.length} cơ sở áp dụng (VitaCare)`
                        : branches[0]?.name || 'Hệ thống VitaCare Clinic'}
                    </Text>
                  </View>
                </View>

                {/* Phân cách nhẹ */}
                <View className="h-px bg-slate-100 my-4" />

                {/* 3. Lý do chọn & Căn cứ đề xuất y khoa (Giống bản Web) */}
                <View className="bg-emerald-50/70 rounded-lg p-3.5 border border-emerald-200/80 mb-4">
                  <View className="flex-row items-center mb-1.5">
                    <Ionicons name="shield-checkmark" size={16} color="#047857" style={{ marginRight: 6 }} />
                    <Text className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                      Lý do chọn &amp; Căn cứ y khoa
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-700 leading-relaxed font-normal">
                    {pkg.description ||
                      'Gói khám được xây dựng và chuẩn hóa bởi đội ngũ bác sĩ chuyên khoa, giúp tầm soát sớm các yếu tố nguy cơ và bảo vệ sức khỏe toàn diện.'}
                  </Text>

                  {/* Triệu chứng / Chỉ định phù hợp (symptoms từ DB) */}
                  {symptoms.length > 0 && (
                    <View className="mt-2.5 pt-2 border-t border-emerald-200/60">
                      <Text className="text-[11px] font-bold text-emerald-950 mb-1.5">
                        Chỉ định phù hợp với các triệu chứng:
                      </Text>
                      <View className="flex-row flex-wrap gap-1.5">
                        {symptoms.map((sym: string, sIdx: number) => (
                          <View
                            key={sIdx}
                            className="bg-white/90 border border-emerald-200 px-2 py-0.5 rounded"
                          >
                            <Text className="text-[11px] font-medium text-emerald-800">
                              {sym}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  <View className="mt-2 pt-2 border-t border-emerald-200/50 flex-row items-start">
                    <Ionicons name="information-circle-outline" size={13} color="#047857" style={{ marginRight: 4, marginTop: 1 }} />
                    <Text className="text-[10px] text-emerald-900/80 italic flex-1">
                      Thông tin mang tính chất tham khảo, không thay thế cho chẩn đoán y khoa trực tiếp.
                    </Text>
                  </View>
                </View>

                {/* 4. Dặn dò chuyên môn & Lưu ý chuẩn bị trước khi khám (Giống Web) */}
                <View className="bg-amber-50 rounded-lg p-3.5 border border-amber-200/80 mb-2">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="bulb-outline" size={16} color="#b45309" style={{ marginRight: 6 }} />
                    <Text className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                      Lưu ý quan trọng khi đi khám
                    </Text>
                  </View>

                  <View className="space-y-1.5 pl-1">
                    {pkg.notes && (
                      <View className="flex-row items-start">
                        <Text className="text-xs text-amber-900 mr-1.5 font-bold">•</Text>
                        <Text className="text-xs text-amber-900/90 flex-1 leading-relaxed">
                          <Text className="font-bold">Dặn dò chuyên môn: </Text>
                          {pkg.notes}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-start">
                      <Text className="text-xs text-amber-900 mr-1.5 font-bold">•</Text>
                      <Text className="text-xs text-amber-900/90 flex-1 leading-relaxed">
                        <Text className="font-bold">Mang theo đơn thuốc hoặc mẫu sản phẩm: </Text>
                        Mang theo toa thuốc, sản phẩm đang dùng hoặc kết quả khám cũ để bác sĩ đối chiếu.
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <Text className="text-xs text-amber-900 mr-1.5 font-bold">•</Text>
                      <Text className="text-xs text-amber-900/90 flex-1 leading-relaxed">
                        <Text className="font-bold">Chuẩn bị: </Text>
                        Tránh trang điểm đậm (đối với Da liễu) hoặc nhịn ăn sáng 6 - 8 tiếng (đối với xét nghiệm máu).
                      </Text>
                    </View>
                    <View className="flex-row items-start">
                      <Text className="text-xs text-amber-900 mr-1.5 font-bold">•</Text>
                      <Text className="text-xs text-amber-900/90 flex-1 leading-relaxed">
                        <Text className="font-bold">Giấy tờ: </Text>
                        Xuất trình CCCD/VNeID hoặc BHYT tại quầy tiếp đón để check-in nhanh bằng QR.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 5. Gói khám bạn đang quan tâm (Giống Web) */}
                {relatedPackages.length > 0 && (
                  <View className="mt-4 pt-4 border-t border-slate-100">
                    <View className="mb-3">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Gợi ý dành cho bạn
                      </Text>
                      <Text className="text-sm font-bold text-slate-900 uppercase tracking-wide mt-0.5">
                        Gói khám bạn đang quan tâm
                      </Text>
                      <Text className="text-xs text-slate-500 mt-0.5">
                        Tầm soát và bảo vệ sức khỏe toàn diện tại hệ thống VitaCare Clinic.
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="-mx-4 px-4 pb-2"
                    >
                      {relatedPackages.map((item: any, idx: number) => {
                        const itemSpecialty =
                          item.specialty?.name || item.specialtyName || item.category || 'Khám chuyên khoa'
                        const itemPrice = Number(item.price || 0)
                        return (
                          <PackageCard
                            key={item.id || idx}
                            id={String(item.id)}
                            name={item.name}
                            description={item.description}
                            price={itemPrice}
                            specialtyName={itemSpecialty}
                            image={item.imageUrl || item.image}
                            onPress={() => {
                              const store = useBookingStore.getState()
                              store.resetBooking()
                              store.setBookingMethod('HEALTH_PACKAGE')
                              store.setHealthPackage({
                                id: String(item.id),
                                name: item.name,
                                price: itemPrice,
                                specialtyId: item.specialtyId || item.specialty?.id,
                              })
                              router.push('/booking/package')
                            }}
                            onDetailPress={() => {
                              router.push(`/package/${item.id || item.slug}`)
                            }}
                          />
                        )
                      })}
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom Bar: Hotline + Giá + Đặt khám ngay */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-4 py-3 flex-row items-center justify-between shadow-lg">
          <TouchableOpacity
            onPress={handleCallHotline}
            activeOpacity={0.7}
            className="flex-row items-center mr-3"
          >
            <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center mr-2 border border-emerald-200">
              <Ionicons name="call" size={14} color="#047857" />
            </View>
            <View>
              <Text className="text-[10px] text-slate-400">Tư vấn 24/7</Text>
              <Text className="text-xs font-bold text-emerald-800">1900 6868</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleBookNow}
            className="flex-1 bg-emerald-700 active:bg-emerald-800 py-3 rounded-lg flex-row items-center justify-center shadow-xs ml-2"
          >
            <Ionicons
              name="calendar-outline"
              size={15}
              color="#ffffff"
              style={{ marginRight: 6 }}
            />
            <Text className="text-xs font-bold text-white">
              Đặt khám ngay
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScreenShell>
  )
}
