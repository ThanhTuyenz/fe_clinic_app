import { useEffect, useState, useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { recommendationService } from '../services/recommendationService'

import { getOrGenerateGuestSessionId } from '../utils/analyticsSession'
export { getOrGenerateGuestSessionId } from '../utils/analyticsSession'
const RECENTLY_VIEWED_KEY = 'vitacare_mobile_recently_viewed_packages'

export interface RecentlyViewedPackage {
  id: string
  name: string
  code?: string
  price: number
  durationMin?: number
  specialtyId?: number | null
  specialtyName?: string
  description?: string
  image?: string
  viewedAt: number
}

/**
 * Hook quản lý Telemetry Tracking hành vi người dùng trên Mobile
 */
export function useBehaviorTracker() {
  const [sessionId, setSessionId] = useState<string>('')
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedPackage[]>([])
  const lastTrackedQueryRef = useRef<string>('')

  // Khởi tạo Session ID & Đọc danh sách gói đã xem gần đây
  useEffect(() => {
    let isMounted = true

    const init = async () => {
      const sid = await getOrGenerateGuestSessionId()
      if (!isMounted) return
      setSessionId(sid)

      try {
        const raw = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY)
        if (raw && isMounted) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            setRecentlyViewed(parsed)
          }
        }
      } catch (err) {
        console.warn('[Telemetry] Failed to load recently viewed packages:', err)
      }
    }

    void init()

    return () => {
      isMounted = false
    }
  }, [])

  /**
   * 1. Tracking Tìm kiếm triệu chứng / dịch vụ (SEARCH +3 điểm)
   */
  const trackSearch = useCallback(
    async (query: string, specialtyId?: number) => {
      if (!query || query.trim().length < 2) return
      const cleanQ = query.trim().toLowerCase()
      if (cleanQ === lastTrackedQueryRef.current) return
      lastTrackedQueryRef.current = cleanQ

      const sid = sessionId || (await getOrGenerateGuestSessionId())
      console.log('🔍 [Mobile Telemetry] SEARCH (+3 pts):', { query: cleanQ, specialtyId, sessionId: sid })

      void recommendationService.trackBehavior({
        sessionId: sid,
        actionType: 'SEARCH',
        searchQuery: cleanQ,
        targetSpecialtyId: specialtyId,
      })
    },
    [sessionId]
  )

  /**
   * 2. Tracking Xem chi tiết gói khám (VIEW_PACKAGE +2 điểm)
   */
  const trackViewPackage = useCallback(
    async (
      packageId: string,
      specialtyId?: number,
      packageDetails?: {
        name?: string
        code?: string
        price?: number
        durationMin?: number
        specialtyName?: string
        description?: string
        image?: string
      }
    ) => {
      if (!packageId) return
      const sid = sessionId || (await getOrGenerateGuestSessionId())
      console.log('👁️ [Mobile Telemetry] VIEW_PACKAGE (+2 pts):', { packageId, specialtyId, sessionId: sid })

      // Gửi event lên Backend
      void recommendationService.trackBehavior({
        sessionId: sid,
        actionType: 'VIEW_PACKAGE',
        targetPackageId: packageId,
        targetSpecialtyId: specialtyId,
      })

      // Lưu vào Recently Viewed cục bộ
      if (packageDetails?.name) {
        try {
          const raw = await AsyncStorage.getItem(RECENTLY_VIEWED_KEY)
          const current: RecentlyViewedPackage[] = raw ? JSON.parse(raw) : []
          const filtered = current.filter((item) => item.id !== packageId)
          const updated: RecentlyViewedPackage[] = [
            {
              id: packageId,
              name: packageDetails.name,
              code: packageDetails.code,
              price: packageDetails.price ?? 0,
              durationMin: packageDetails.durationMin,
              specialtyId: specialtyId ?? null,
              specialtyName: packageDetails.specialtyName,
              description: packageDetails.description,
              image: packageDetails.image,
              viewedAt: Date.now(),
            },
            ...filtered,
          ].slice(0, 10)

          await AsyncStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated))
          setRecentlyViewed(updated)
        } catch (err) {
          console.warn('[Telemetry] Failed to save recently viewed package:', err)
        }
      }
    },
    [sessionId]
  )

  /**
   * 3. Tracking Bỏ dở quy trình đặt khám (DROP_OFF +5 điểm)
   */
  const trackDropOff = useCallback(
    async (packageId?: string, specialtyId?: number) => {
      if (!packageId && !specialtyId) return
      const sid = sessionId || (await getOrGenerateGuestSessionId())
      console.log('🚪 [Mobile Telemetry] DROP_OFF (+5 pts):', { packageId, specialtyId, sessionId: sid })

      void recommendationService.trackBehavior({
        sessionId: sid,
        actionType: 'DROP_OFF',
        targetPackageId: packageId,
        targetSpecialtyId: specialtyId,
      })
    },
    [sessionId]
  )

  /**
   * Xóa lịch sử các gói đã xem gần đây
   */
  const clearRecentlyViewed = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(RECENTLY_VIEWED_KEY)
      setRecentlyViewed([])
    } catch (err) {
      console.warn('[Telemetry] Failed to clear recently viewed packages:', err)
    }
  }, [])

  return {
    sessionId,
    recentlyViewed,
    trackSearch,
    trackViewPackage,
    trackDropOff,
    clearRecentlyViewed,
  }
}
