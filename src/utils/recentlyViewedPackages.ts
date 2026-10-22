export const RECENTLY_VIEWED_KEY = 'vitacare_mobile_recently_viewed_packages'

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
