import { useCallback, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { recommendationService } from '../services/recommendationService'

import { getOrGenerateGuestSessionId } from '../utils/analyticsSession'
import { RECENTLY_VIEWED_KEY, type RecentlyViewedPackage } from '../utils/recentlyViewedPackages'
export type { RecentlyViewedPackage } from '../utils/recentlyViewedPackages'
export { getOrGenerateGuestSessionId } from '../utils/analyticsSession'

/**
 * Hook quản lý Telemetry Tracking hành vi người dùng trên Mobile
 */
export function useBehaviorTracker() {
  const lastTrackedQueryRef = useRef<string>('')

  /**
   * 1. Tracking Tìm kiếm triệu chứng / dịch vụ (SEARCH +3 điểm)
   */
  const trackSearch = useCallback(
    async (query: string, specialtyId?: number) => {
      if (!query || query.trim().length < 2) return
      const cleanQ = query.trim().toLowerCase()
      if (cleanQ === lastTrackedQueryRef.current) return
      lastTrackedQueryRef.current = cleanQ

      const sid = await getOrGenerateGuestSessionId()

      void recommendationService.trackBehavior({
        sessionId: sid,
        actionType: 'SEARCH',
        searchQuery: cleanQ,
        targetSpecialtyId: specialtyId,
      })
    },
    []
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
      const sid = await getOrGenerateGuestSessionId()

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
        } catch (err) {
          console.warn('[Telemetry] Failed to save recently viewed package:', err)
        }
      }
    },
    []
  )

  /**
   * 3. Tracking Bỏ dở quy trình đặt khám (DROP_OFF +5 điểm)
   */
  const trackDropOff = useCallback(
    async (packageId?: string, specialtyId?: number) => {
      if (!packageId && !specialtyId) return
      const sid = await getOrGenerateGuestSessionId()

      void recommendationService.trackBehavior({
        sessionId: sid,
        actionType: 'DROP_OFF',
        targetPackageId: packageId,
        targetSpecialtyId: specialtyId,
      })
    },
    []
  )

  return {
    trackSearch,
    trackViewPackage,
    trackDropOff,
  }
}
