import { useState, useEffect } from 'react'
import { RefreshControl, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useBookingStore } from '../../src/store/useBookingStore'
import { doctorService } from '../../src/services/doctorService'
import {
  recommendationService,
  RecommendedPackageItem,
  SemanticSearchResultItem,
  SearchDoctorItem,
  SearchBranchItem,
} from '../../src/services/recommendationService'
import { notificationService } from '../../src/services/notificationService'
import { usePushNotifications } from '../../src/hooks/usePushNotifications'
import { useBehaviorTracker } from '../../src/hooks/useBehaviorTracker'
import { useSemanticSearch } from '../../src/hooks/useSemanticSearch'
import { searchAnalytics } from '../../src/services/searchAnalytics'
import { Doctor } from '../../src/types/doctor'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { BookingMethodsModal } from '../../src/components/booking/BookingMethodsModal'
import {
  HomeHeader,
  HomeSearchBar,
  HeroBanner,
  RecommendationSection,
  SpecialtiesGridSection,
  ExplorePackagesSection,
  DoctorsSection,
  FacilitiesSection,
  ClinicStatsSection,
  MedicalNewsSection,
} from '../../src/components/home'

export default function HomeScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const { sessionId, trackSearch } = useBehaviorTracker()
  usePushNotifications(isAuthenticated)

  const setDoctor = useBookingStore((state) => state.setDoctor)
  const [searchQuery, setSearchQuery] = useState('')
  const [bookingModalVisible, setBookingModalVisible] = useState(false)
  const { results: searchResults, isSearching, error: searchError, retry: retrySearch } = useSemanticSearch(searchQuery)
  useEffect(() => {
    if (searchResults && !searchResults.partial && !isSearching) void trackSearch(searchResults.query)
  }, [searchResults, isSearching, trackSearch])


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
    queryKey: ['homeRecommendations', user?.id, sessionId],
    queryFn: () => recommendationService.getHomeRecommendations({ sessionId: sessionId || undefined }),
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

  const handleSelectRecommendedPackage = (pkg: RecommendedPackageItem) => {
    const store = useBookingStore.getState()
    store.resetBooking()
    store.setBookingMethod('HEALTH_PACKAGE')
    store.setHealthPackage({
      id: pkg.packageId,
      name: pkg.name,
      price: pkg.price,
      specialtyId: pkg.specialtyId,
    })
    router.push('/booking/package')
  }

  const handleSelectSearchPackage = async (pkg: SemanticSearchResultItem) => {
    await searchAnalytics.click(searchResults?.searchId, 'PACKAGE', pkg.id, (searchResults?.packages.findIndex(item => item.id === pkg.id) ?? 0) + 1, pkg.branchId).catch(() => {})
    router.push({ pathname: '/package/[id]', params: {
      id: pkg.id, branchId: pkg.branchId || '', bookingMethodCode: pkg.bookingMethodCode || '',
    } })
  }

  const handleSelectSearchDoctor = async (doc: SearchDoctorItem) => {
    await searchAnalytics.click(searchResults?.searchId, 'DOCTOR', doc.id, (searchResults?.doctors?.findIndex(item => item.id === doc.id) ?? 0) + 1).catch(() => {})
    useBookingStore.getState().resetBooking()
    router.push(`/booking?doctorId=${doc.id}` as any)
  }

  const handleSelectSearchBranch = async (branch: SearchBranchItem) => {
    await searchAnalytics.click(searchResults?.searchId, 'BRANCH', branch.id, (searchResults?.branches?.findIndex(item => item.id === branch.id) ?? 0) + 1, branch.id).catch(() => {})
    useBookingStore.getState().resetBooking()
    router.push({ pathname: '/booking', params: { branchId: branch.id } })
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
        className="flex-1 bg-slate-50/40"
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            tintColor="#28a745"
            colors={['#28a745']}
            onRefresh={() => {
              refetchDoctors()
              refetchDepts()
              refetchRecs()
              if (isAuthenticated) refetchNotifs()
            }}
          />
        }
      >
        {/* Header & Search */}
        <HomeHeader
          patientName={patientName}
          isAuthenticated={isAuthenticated}
          unreadCount={unreadData?.unreadCount || 0}
          onNotificationsPress={() => router.push('/(tabs)/notifications')}
          onAiChatPress={() => router.push('/(tabs)/ai-chat')}
          onLoginPress={() => router.push('/(auth)/login')}
        />

        <HomeSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          isLoading={isSearching}
          searchResults={searchResults}
          error={searchError}
          onRetry={() => void retrySearch()}
          showDropdown={Boolean(searchQuery.trim().length >= 2)}
          onSelectPackage={handleSelectSearchPackage}
          onSelectDoctor={handleSelectSearchDoctor}
          onSelectBranch={handleSelectSearchBranch}
          onFilterPress={() => router.push({ pathname: '/booking', params: { method: 'doctor' } })}
        />


        <HeroBanner onStartBooking={() => setBookingModalVisible(true)} />

        {/* 1. [Khối Cá nhân hóa] Gợi ý cho bạn & Nhắc lịch khám */}
        <RecommendationSection
          packages={homeRecs?.packages || []}
          isLoading={loadingRecs}
          onRefresh={refetchRecs}
          onSelectPackage={handleSelectRecommendedPackage}
        />

        {/* 2. [Khối Điều hướng] Danh mục Chuyên khoa (Grid icon nhỏ gọn + Gói chuyên khoa) */}
        <SpecialtiesGridSection />

        {/* 3. [Khối Khám phá] Gói khám nổi bật (Tabs: "Tổng quát" | "Xem gần đây") */}
        <ExplorePackagesSection />

        {/* 4. [Khối Chuyên gia] Đội ngũ Bác sĩ tiêu biểu */}
        <DoctorsSection
          doctors={filteredDoctors}
          isLoading={loadingDoctors}
          searchQuery={searchQuery}
          onSelectDoctor={handleSelectDoctor}
          onViewAll={() => router.push('/booking')}
        />

        {/* Khối cơ sở y tế & Thống kê */}
        <FacilitiesSection onStartBooking={() => setBookingModalVisible(true)} />
        <ClinicStatsSection />
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
