import { api, unwrapNestResponse } from './api'

export interface RecommendedPackageItem {
  packageId: string
  code: string
  name: string
  price: number
  durationMin?: number
  specialtyId?: number
  specialtyName?: string
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  badge?: string
  clinicalReason?: string
  sourceType?: 'DROP_OFF' | 'SEARCH_INTENT' | 'PROFILE_AI' | 'POPULAR'
}

export interface HomeRecommendationResponse {
  profileId?: string
  profileName?: string
  updatedAt: string
  source: 'HYBRID' | 'AI_PROFILE' | 'BEHAVIOR' | 'FALLBACK'
  packages: RecommendedPackageItem[]
}

export const recommendationService = {
  async getHomeRecommendations(params?: {
    profileId?: string
    sessionId?: string
    branchId?: string
  }): Promise<HomeRecommendationResponse> {
    try {
      const res = await api.get('/api/v1/recommendations/home', { params })
      const data = unwrapNestResponse<HomeRecommendationResponse>(res.data)
      return data || { updatedAt: new Date().toISOString(), source: 'FALLBACK', packages: [] }
    } catch {
      return { updatedAt: new Date().toISOString(), source: 'FALLBACK', packages: [] }
    }
  },

  async refreshProfileRecommendations(
    profileId: string,
    branchId?: string
  ): Promise<HomeRecommendationResponse> {
    try {
      const res = await api.post(
        `/api/v1/recommendations/patient-profile/${profileId}/refresh`,
        {},
        { params: { branchId } }
      )
      const data = unwrapNestResponse<HomeRecommendationResponse>(res.data)
      return data || { updatedAt: new Date().toISOString(), source: 'AI_PROFILE', packages: [] }
    } catch {
      return { updatedAt: new Date().toISOString(), source: 'AI_PROFILE', packages: [] }
    }
  },
}
