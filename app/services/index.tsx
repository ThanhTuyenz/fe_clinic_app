import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
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
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { doctorService } from '../../src/services/doctorService'
import { useBookingStore } from '../../src/store/useBookingStore'
import { useBehaviorTracker } from '../../src/hooks/useBehaviorTracker'
import { useSemanticSearch } from '../../src/hooks/useSemanticSearch'
import { searchAnalytics } from '../../src/services/searchAnalytics'
import { formatCurrencyVi } from '../../src/utils/date'

const CURATED_IMAGES = {
  da_lieu: [
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80',
  ],
  ho_hap: [
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
  ],
  mat: [
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
  ],
  tai_mui_hong: [
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&auto=format&fit=crop&q=80',
  ],
  tim_mach: [
    'https://images.unsplash.com/photo-1628348068343-c6a848d2b6dd?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
  ],
  nhi_khoa: [
    'https://images.unsplash.com/photo-1631815589968-fdb09a223b1e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515933487-779824d29309?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
  ],
  san_phu_khoa: [
    'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1629909615184-74f495363b67?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80',
  ],
  rang_ham_mat: [
    'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&auto=format&fit=crop&q=80',
  ],
  tieu_hoa: [
    'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80',
  ],
  co_xuong_khop: [
    'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
  ],
  tong_quat: [
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?w=800&auto=format&fit=crop&q=80',
  ],
}

const getPackageImage = (name: string, specialtyName?: string, customImage?: string): string => {
  if (customImage && customImage.trim()) return customImage
  const combined = (name + ' ' + (specialtyName || '')).toLowerCase()

  // Xác định nhóm chuyên khoa
  let pool = CURATED_IMAGES.tong_quat
  if (combined.includes('da') || combined.includes('mụn') || combined.includes('liễu')) {
    pool = CURATED_IMAGES.da_lieu
  } else if (combined.includes('hô hấp') || combined.includes('phổi') || combined.includes('ho')) {
    pool = CURATED_IMAGES.ho_hap
  } else if (combined.includes('mắt') || combined.includes('thị lực') || combined.includes('khúc xạ')) {
    pool = CURATED_IMAGES.mat
  } else if (combined.includes('tai') || combined.includes('mũi') || combined.includes('họng') || combined.includes('xoang')) {
    pool = CURATED_IMAGES.tai_mui_hong
  } else if (combined.includes('tim') || combined.includes('mạch') || combined.includes('huyết áp')) {
    pool = CURATED_IMAGES.tim_mach
  } else if (combined.includes('nhi') || combined.includes('trẻ em')) {
    pool = CURATED_IMAGES.nhi_khoa
  } else if (combined.includes('sản') || combined.includes('phụ khoa') || combined.includes('thai') || combined.includes('nữ')) {
    pool = CURATED_IMAGES.san_phu_khoa
  } else if (combined.includes('răng') || combined.includes('nha') || combined.includes('hàm mặt')) {
    pool = CURATED_IMAGES.rang_ham_mat
  } else if (combined.includes('tiêu hóa') || combined.includes('gan') || combined.includes('dạ dày')) {
    pool = CURATED_IMAGES.tieu_hoa
  } else if (combined.includes('xương') || combined.includes('khớp') || combined.includes('cột sống')) {
    pool = CURATED_IMAGES.co_xuong_khop
  }

  // Chọn ảnh riêng biệt theo loại dịch vụ (Tư vấn: index 0, Tái khám: index 1, Trong giờ: index 2, Ngoài giờ: index 3)
  if (combined.includes('tư vấn') || combined.includes('advice')) return pool[0] || pool[0]
  if (combined.includes('tái khám') || combined.includes('followup')) return pool[1] || pool[0]
  if (combined.includes('trong giờ') || combined.includes('gói') || combined.includes('tầm soát')) return pool[2] || pool[0]
  if (combined.includes('ngoài giờ') || combined.includes('after')) return pool[3] || pool[0]

  // Fallback băm chuỗi để luôn ra ảnh cố định đẹp mắt
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i)) % pool.length
  }
  return pool[hash]
}

export default function ServicesScreen() {
  const router = useRouter()
  const { trackSearch } = useBehaviorTracker()
  const [searchQuery, setSearchQuery] = useState('')
  const { results: semanticResults, isSearching, error: searchError, retry: retrySearch } = useSemanticSearch(searchQuery)
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<number | 'all'>('all')
  const [priceFilter, setPriceFilter] = useState<'all' | 'under1m' | '1to3m' | 'over3m'>('all')
  const [sortBy, setSortBy] = useState<'default' | 'priceAsc' | 'priceDesc'>('default')
  const [favorites, setFavorites] = useState<Record<string, boolean>>({})

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Record personal interests only after a current, successful search.
  useEffect(() => {
    if (semanticResults && !semanticResults.partial && !isSearching) void trackSearch(semanticResults.query)
  }, [semanticResults, isSearching, trackSearch])

  // 1. Fetch Toàn bộ Danh sách Gói khám thực tế từ DB qua API
  const {
    data: allPackages = [],
    isLoading: loadingPackages,
    refetch: refetchPackages,
    isRefetching,
  } = useQuery({
    queryKey: ['allClinicPackages'],
    queryFn: async () => {
      const pkgs = await doctorService.getAllPackages({ type: 'all', limit: 200, needPagination: false })
      return Array.isArray(pkgs) ? pkgs : []
    },
  })

  // 2. Fetch Danh mục Chuyên khoa
  const { data: specialties = [] } = useQuery({
    queryKey: ['specialties'],
    queryFn: () => doctorService.getSpecialties(),
  })

  // 3. Khử trùng lặp giữa 2 chi nhánh (Hiển thị 62 gói dịch vụ duy nhất, tên sạch đẹp)
  const uniquePackages = useMemo(() => {
    const map = new Map<string, any>()
    for (const p of allPackages) {
      const cleanName = (p.name || '').replace(/\s*\(VitaCare[^)]*\)\s*$/i, '').trim()
      const specId = p.specialtyId || p.specialty?.id || 0
      const key = `${cleanName.toLowerCase()}__${specId}`
      if (!map.has(key)) {
        map.set(key, { ...p, displayName: cleanName })
      }
    }
    return Array.from(map.values())
  }, [allPackages])

  // 4. Lọc & Sắp xếp dữ liệu theo Chuyên khoa, Tìm kiếm, Mức giá
  const filteredPackages = useMemo(() => {
    let list = searchQuery.trim().length >= 2
      ? (semanticResults?.packages || []).map(hit => ({ ...allPackages.find(pkg => String(pkg.id) === hit.id), ...hit }))
      : [...uniquePackages]

    // Lọc theo Chuyên khoa
    if (selectedSpecialtyId !== 'all') {
      list = list.filter((p) => {
        const specId = p.specialtyId || p.specialty?.id
        return String(specId) === String(selectedSpecialtyId)
      })
    }


    // Lọc theo Mức giá
    if (priceFilter === 'under1m') {
      list = list.filter((p) => Number(p.price || 0) < 1000000)
    } else if (priceFilter === '1to3m') {
      list = list.filter((p) => {
        const pr = Number(p.price || 0)
        return pr >= 1000000 && pr <= 3000000
      })
    } else if (priceFilter === 'over3m') {
      list = list.filter((p) => Number(p.price || 0) > 3000000)
    }

    // Sắp xếp
    if (sortBy === 'priceAsc') {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
    } else if (sortBy === 'priceDesc') {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
    }

    return list
  }, [uniquePackages, allPackages, semanticResults, selectedSpecialtyId, searchQuery, priceFilter, sortBy])

  // Xử lý khi bấm đặt khám gói
  const handleBookPackage = async (pkg: any) => {
    if (semanticResults?.searchId) await searchAnalytics.click(semanticResults.searchId, 'PACKAGE', String(pkg.id), semanticResults.packages.findIndex(item => item.id === String(pkg.id)) + 1, pkg.branchId).catch(() => {})
    const store = useBookingStore.getState()
    store.resetBooking()
    const branchId = pkg.branchId || pkg.branchBookingMethod?.branchId || ''
    if (branchId) store.setBranchId(branchId)
    if ((pkg.bookingMethodCode || pkg.bookingMethod?.code || pkg.branchBookingMethod?.bookingMethod?.code) === 'SPECIALTY_EXAM') {
      router.push({ pathname: '/booking/specialty', params: {
        branchId, specialtyId: String(pkg.specialtyId || pkg.specialty?.id || ''), serviceId: String(pkg.id),
      } })
      return
    }
    store.setBookingMethod('HEALTH_PACKAGE')
    store.setHealthPackage({
      id: String(pkg.id),
      name: pkg.displayName || pkg.name,
      price: Number(pkg.price || 0),
      specialtyId: pkg.specialtyId || pkg.specialty?.id,
    })
    router.push('/booking/package')
  }

  return (
    <ScreenShell>
      {/* Header */}
      <View className="bg-white px-4 pt-3 pb-3 border-b border-slate-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
          >
            <Ionicons name="chevron-back" size={18} color="#334155" />
          </TouchableOpacity>
          <View>
            <Text className="text-base font-extrabold text-slate-900">
              Dịch vụ & Gói khám
            </Text>
            <Text className="text-[11px] text-slate-400">
              {filteredPackages.length} dịch vụ y tế chuyên khoa
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            setSearchQuery('')
            setSelectedSpecialtyId('all')
            setPriceFilter('all')
            setSortBy('default')
          }}
          className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200"
        >
          <Text className="text-[11px] font-semibold text-slate-600">Đặt lại</Text>
        </TouchableOpacity>
      </View>

      {/* Thanh Tìm kiếm */}
      <View className="bg-white px-4 py-2.5 border-b border-slate-100">
        <View className="flex-row items-center bg-slate-50 border border-slate-200/90 rounded-lg px-3 py-2">
          <Ionicons name="search-outline" size={15} color="#64748b" style={{ marginRight: 6 }} />
          <TextInput
            placeholder="Tìm theo tên gói, triệu chứng hoặc chuyên khoa..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            maxLength={200}
            onChangeText={setSearchQuery}
            className="flex-1 text-xs text-slate-800 p-0 outline-none"
            style={[{ outlineWidth: 0, outlineStyle: 'none' } as any]}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={15} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Danh mục Chuyên khoa Scroll Ngang */}
      <View className="bg-white py-2 border-b border-slate-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
        >
          <TouchableOpacity
            onPress={() => setSelectedSpecialtyId('all')}
            className={`px-3 py-1.5 rounded-lg border ${
              selectedSpecialtyId === 'all'
                ? 'bg-slate-900 border-slate-900'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                selectedSpecialtyId === 'all' ? 'text-white' : 'text-slate-600'
              }`}
            >
              Tất cả ({uniquePackages.length})
            </Text>
          </TouchableOpacity>

          {specialties.map((spec: any) => {
            const isSelected = selectedSpecialtyId === spec.id
            const count = uniquePackages.filter(
              (p) => (p.specialtyId || p.specialty?.id) === spec.id
            ).length

            return (
              <TouchableOpacity
                key={spec.id}
                onPress={() => setSelectedSpecialtyId(spec.id)}
                className={`px-3 py-1.5 rounded-lg border ${
                  isSelected
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {spec.name} {count > 0 ? `(${count})` : ''}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {/* Bộ lọc mức giá & Sắp xếp */}
      <View className="bg-white px-4 py-2 border-b border-slate-100 flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5 flex-wrap">
          <TouchableOpacity
            onPress={() => setPriceFilter(priceFilter === 'under1m' ? 'all' : 'under1m')}
            className={`px-2 py-1 rounded text-[11px] border ${
              priceFilter === 'under1m'
                ? 'bg-primary-50 border-primary-300 text-primary-800'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <Text
              className={`text-[11px] font-medium ${
                priceFilter === 'under1m' ? 'text-primary-800' : 'text-slate-500'
              }`}
            >
              &lt; 1 Triệu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriceFilter(priceFilter === '1to3m' ? 'all' : '1to3m')}
            className={`px-2 py-1 rounded text-[11px] border ${
              priceFilter === '1to3m'
                ? 'bg-primary-50 border-primary-300 text-primary-800'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <Text
              className={`text-[11px] font-medium ${
                priceFilter === '1to3m' ? 'text-primary-800' : 'text-slate-500'
              }`}
            >
              1 - 3 Triệu
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setPriceFilter(priceFilter === 'over3m' ? 'all' : 'over3m')}
            className={`px-2 py-1 rounded text-[11px] border ${
              priceFilter === 'over3m'
                ? 'bg-primary-50 border-primary-300 text-primary-800'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <Text
              className={`text-[11px] font-medium ${
                priceFilter === 'over3m' ? 'text-primary-800' : 'text-slate-500'
              }`}
            >
              &gt; 3 Triệu
            </Text>
          </TouchableOpacity>
        </View>

        {/* Nút Đổi sắp xếp giá */}
        <TouchableOpacity
          onPress={() => {
            if (sortBy === 'default') setSortBy('priceAsc')
            else if (sortBy === 'priceAsc') setSortBy('priceDesc')
            else setSortBy('default')
          }}
          className="flex-row items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200"
        >
          <Ionicons name="swap-vertical-outline" size={12} color="#64748b" />
          <Text className="text-[11px] font-medium text-slate-600">
            {sortBy === 'priceAsc' ? 'Giá tăng dần' : sortBy === 'priceDesc' ? 'Giá giảm dần' : 'Mặc định'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách Gói khám Lưới 2 Cột (2 Cards / Hàng) */}
      {searchError ? (
        <View className="p-6 items-center">
          <Text className="text-sm text-slate-600 text-center">{searchError}</Text>
          <TouchableOpacity onPress={() => void retrySearch()} className="p-3">
            <Text className="text-sm text-primary-700">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : loadingPackages || isSearching ? (
        <View className="flex-1 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#28a745" />
          <Text className="text-xs text-slate-400 mt-3">Đang tải danh sách dịch vụ...</Text>
        </View>
      ) : (
        <FlatList
          key="services-2-col"
          data={filteredPackages}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          keyExtractor={(item, index) => item.id || String(index)}
          contentContainerStyle={{ padding: 14, paddingBottom: 90 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              tintColor="#28a745"
              onRefresh={() => { void refetchPackages() }}
            />
          }
          ListEmptyComponent={
            <View className="py-20 items-center justify-center">
              <Ionicons name="medical-outline" size={36} color="#cbd5e1" />
              <Text className="text-sm font-bold text-slate-700 mt-3">
                Không tìm thấy gói khám phù hợp
              </Text>
              <Text className="text-xs text-slate-400 mt-1 text-center px-8">
                Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn các bộ lọc chuyên khoa.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('')
                  setSelectedSpecialtyId('all')
                  setPriceFilter('all')
                }}
                className="mt-4 px-4 py-2 rounded-lg bg-slate-900"
              >
                <Text className="text-xs font-bold text-white">Xem toàn bộ gói khám</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const specialtyName = item.specialty?.name || item.specialtyName || 'Chuyên khoa'
            const price = Number(item.price || 0)
            const displayName = item.displayName || item.name
            const coverImage = getPackageImage(displayName, specialtyName, item.imageUrl || item.image)

            return (
              <View
                className="flex-1 bg-white rounded-xl border border-slate-200/90 mb-2.5 overflow-hidden shadow-2xs flex-col justify-between"
                style={{ maxWidth: '48.5%' }}
              >
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={async () => {
                    if (semanticResults?.searchId) await searchAnalytics.click(semanticResults.searchId, 'PACKAGE', String(item.id), semanticResults.packages.findIndex(pkg => pkg.id === String(item.id)) + 1, item.branchId).catch(() => {})
                    router.push({ pathname: '/package/[id]', params: { id: String(item.id || item.slug), branchId: item.branchId || '', bookingMethodCode: item.bookingMethodCode || '' } })
                  }}
                >
                  {/* Image Cover */}
                  <View className="w-full bg-slate-100 relative overflow-hidden" style={{ height: 110 }}>
                    <Image
                      source={{ uri: coverImage }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={200}
                    />
                    <View className="absolute top-1.5 left-1.5 bg-slate-900/80 px-1.5 py-0.5 rounded">
                      <Text className="text-[8.5px] text-white tracking-wide">
                        {specialtyName.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Body Content */}
                  <View className="p-2 flex-1 justify-between">
                    <View>
                      <Text
                        className="text-xs font-bold text-slate-900 leading-tight"
                        numberOfLines={2}
                        style={{ minHeight: 32 }}
                      >
                        {displayName}
                      </Text>

                      {item.description ? (
                        <Text
                          className="text-[10.5px] text-slate-500 mt-1 leading-4"
                          numberOfLines={2}
                          ellipsizeMode="tail"
                          style={{ minHeight: 28 }}
                        >
                          {item.description}
                        </Text>
                      ) : (
                        <View style={{ minHeight: 28 }} />
                      )}
                    </View>

                    <View className="mt-1.5 flex-row items-center justify-between gap-1.5">
                      <Text className="text-[10px] text-slate-400 flex-1" numberOfLines={1}>
                        {specialtyName}
                      </Text>
                      <Text className="text-xs text-slate-900 shrink-0" numberOfLines={1} style={{ whiteSpace: 'nowrap' } as any}>
                        {formatCurrencyVi(price)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Footer Action Buttons */}
                <View className="p-2 pt-0 flex-row items-center gap-1.5">
                  <TouchableOpacity
                    onPress={() => handleBookPackage(item)}
                    activeOpacity={0.8}
                    className="flex-1 rounded-lg bg-primary-600 items-center justify-center active:bg-primary-800"
                    style={{ paddingVertical: 6 }}
                  >
                    <Text className="text-[11px] text-white">
                      Đặt khám
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => toggleFavorite(String(item.id))}
                    activeOpacity={0.7}
                    className={`w-7 h-7 rounded-lg items-center justify-center border ${
                      favorites[String(item.id)]
                        ? 'bg-rose-50 border-rose-200'
                        : 'bg-slate-50 border-slate-200 active:bg-slate-100'
                    }`}
                  >
                    <Ionicons
                      name={favorites[String(item.id)] ? 'heart' : 'heart-outline'}
                      size={14}
                      color={favorites[String(item.id)] ? '#e11d48' : '#94a3b8'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}
    </ScreenShell>
  )
}
