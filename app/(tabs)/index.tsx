import React, { useState } from 'react'
import { RefreshControl, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useBookingStore } from '../../src/store/useBookingStore'
import { doctorService } from '../../src/services/doctorService'
import {
  recommendationService,
  RecommendedPackageItem,
} from '../../src/services/recommendationService'
import { notificationService } from '../../src/services/notificationService'
import { usePushNotifications } from '../../src/hooks/usePushNotifications'
import { Doctor } from '../../src/types/doctor'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { BookingMethodsModal } from '../../src/components/booking/BookingMethodsModal'
import {
  HomeHeader,
  HomeSearchBar,
  HeroBanner,
  BookingMethodsSection,
  BookingMethodItem,
  RecommendationSection,
  DoctorsSection,
  HealthPackagesSection,
  StaticHealthPackageItem,
  FacilitiesSection,
  ClinicStatsSection,
  MedicalNewsSection,
} from '../../src/components/home'

export default function HomeScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  usePushNotifications(isAuthenticated)

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

  const {
    data: homeRecs,
    isLoading: loadingRecs,
    refetch: refetchRecs,
  } = useQuery({
    queryKey: ['homeRecommendations', user?.id],
    queryFn: () => recommendationService.getHomeRecommendations(),
  })

  const { data: unreadData, refetch: refetchNotifs } = useQuery({
    queryKey: ['unreadNotifications', user?.id],
    queryFn: () => notificationService.getUnreadCount(),
    enabled: isAuthenticated,
  })

  const handleSelectDoctor = (doc: Doctor) => {
    setDoctor(doc)
    router.push(`/booking?doctorId=${doc.id}` as any)
  }

  const handleSelectBookingMethod = (method: BookingMethodItem) => {
    setSelectedMethod(method.id)
    const store = useBookingStore.getState()
    store.resetBooking()
    store.setBookingMethod(method.code as any)
    if (method.id === 'after-hours') {
      store.setIsAfterHours(true)
    }
    router.push(method.path as any)
  }

  const handleSelectHealthPackage = (pkg: StaticHealthPackageItem) => {
    const store = useBookingStore.getState()
    store.resetBooking()
    store.setBookingMethod('HEALTH_PACKAGE')
    router.push(`/booking?packageId=${pkg.id}&method=package` as any)
  }

  const handleSelectRecommendedPackage = (pkg: RecommendedPackageItem) => {
    const store = useBookingStore.getState()
    store.resetBooking()
    store.setBookingMethod('HEALTH_PACKAGE')
    router.push(`/booking?packageId=${pkg.packageId}&method=package` as any)
  }

  const patientName = user?.full_name || user?.fullName || user?.name || 'Quý khách'

  const filteredDoctors = doctors.filter((doc) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const name = (doc.full_name || doc.fullName || doc.name || '').toLowerCase()
    const spec = (
      typeof doc.specialty === 'object' ? doc.specialty?.name : doc.specialty || ''
    ).toLowerCase()
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
              refetchRecs()
              if (isAuthenticated) refetchNotifs()
            }}
          />
        }
      >
        {/* Section 1: Header */}
        <HomeHeader
          patientName={patientName}
          isAuthenticated={isAuthenticated}
          unreadCount={unreadData?.unreadCount || 0}
          onNotificationsPress={() => router.push('/(tabs)/notifications')}
          onAiChatPress={() => router.push('/(tabs)/ai-chat')}
          onLoginPress={() => router.push('/(auth)/login')}
        />

        {/* Section 2: Search Bar */}
        <HomeSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFilterPress={() => router.push({ pathname: '/booking', params: { method: 'doctor' } })}
        />

        {/* Section 3: Hero Banner */}
        <HeroBanner onStartBooking={() => setBookingModalVisible(true)} />

        {/* Section 4: Phương thức khám bệnh */}
        <BookingMethodsSection
          selectedMethod={selectedMethod}
          onSelectMethod={handleSelectBookingMethod}
          onViewAll={() => setBookingModalVisible(true)}
        />

        {/* Section 5: Gợi ý dành cho bạn */}
        <RecommendationSection
          packages={homeRecs?.packages || []}
          isLoading={loadingRecs}
          onRefresh={refetchRecs}
          onSelectPackage={handleSelectRecommendedPackage}
        />

        {/* Section 6: Đội ngũ bác sĩ tiêu biểu */}
        <DoctorsSection
          doctors={filteredDoctors}
          isLoading={loadingDoctors}
          searchQuery={searchQuery}
          onSelectDoctor={handleSelectDoctor}
          onViewAll={() => router.push('/booking')}
        />

        {/* Section 7: Gói khám sức khỏe toàn diện */}
        <HealthPackagesSection
          onSelectPackage={handleSelectHealthPackage}
          onViewAll={() => router.push({ pathname: '/booking', params: { method: 'package' } })}
        />

        {/* Section 8: Cơ sở y tế nổi bật */}
        <FacilitiesSection onStartBooking={() => setBookingModalVisible(true)} />

        {/* Section 9: Thống kê năng lực */}
        <ClinicStatsSection />

        {/* Section 10: Kiến thức y khoa */}
        <MedicalNewsSection />
      </ScrollView>

      {/* Modal Phương thức Đặt lịch */}
      <BookingMethodsModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
      />
    </ScreenShell>
  )
}
