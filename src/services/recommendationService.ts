import { api, unwrapNestResponse } from './api'
import { getOrGenerateGuestSessionId } from '../utils/analyticsSession'

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
  sourceType?: 'DROP_OFF' | 'SEARCH_INTENT' | 'RECENT_VIEW' | 'PROFILE_AI'
}

export interface RecommendationSectionResponse {
  status: 'READY' | 'EMPTY' | 'PENDING'
  trackingToken?: string
  updatedAt: string
  fromCache: boolean
  packages: RecommendedPackageItem[]
}

export interface ProfileRecommendationSectionResponse extends RecommendationSectionResponse {
  profileId: string
  profileName?: string
}

export interface ProfileRecommendationResponse {
  profileId: string
  profileName?: string
  updatedAt: string
  source: 'AI_OPENAI' | 'RULE_FALLBACK' | 'REDIS_CACHE'
  packages: RecommendedPackageItem[]
}

export interface TrackBehaviorPayload {
  sessionId: string
  actionType: 'SEARCH' | 'VIEW_PACKAGE' | 'DROP_OFF'
  targetSpecialtyId?: number
  targetPackageId?: string
  searchQuery?: string
}

export interface SemanticSearchResultItem {
  branchId?: string
  bookingMethodCode?: string
  specialtyId?: number | null
  id: string
  code: string
  name: string
  price: number
  durationMin?: number
  specialtyName: string
  similarityScore: number
  description: string
}

export interface SearchDoctorItem {
  id: string
  fullName: string
  academicRank: string
  specialties: string[]
  experienceYears: number
  avatarUrl?: string | null
}

export interface SearchBranchItem {
  id: string
  code: string
  name: string
  address: string
  phoneNumber?: string
}

export interface SemanticSearchResponse {
  searchId?: string
  partial?: boolean
  query: string
  total: number
  packages: SemanticSearchResultItem[]
  doctors?: SearchDoctorItem[]
  branches?: SearchBranchItem[]
}

export const recommendationService = {
  async getProfileRecommendations(profileId: string, sessionId?: string): Promise<ProfileRecommendationSectionResponse> {
    const res = await api.get(`/api/v1/recommendations/patient-profile/${encodeURIComponent(profileId)}`, { params: { sessionId }, timeout: 60000 })
    return unwrapNestResponse<ProfileRecommendationSectionResponse>(res.data)
  },

  async getBehaviorRecommendations(sessionId?: string): Promise<RecommendationSectionResponse> {
    const res = await api.get('/api/v1/recommendations/behavior', { params: { sessionId }, timeout: 60000 })
    return unwrapNestResponse<RecommendationSectionResponse>(res.data)
  },

  async trackBehavior(payload: TrackBehaviorPayload): Promise<{ success: boolean }> {
    try {
      const res = await api.post('/api/v1/recommendations/track', payload)
      const data = unwrapNestResponse<{ success: boolean }>(res.data)
      return data || { success: true }
    } catch {
      // Non-blocking telemetry
      return { success: false }
    }
  },

  async refreshProfileRecommendations(
    profileId: string
  ): Promise<ProfileRecommendationResponse> {
    const res = await api.post(`/api/v1/recommendations/patient-profile/${profileId}/refresh`, {}, { timeout: 60000 })
    return unwrapNestResponse<ProfileRecommendationResponse>(res.data)
  },

  async semanticSearch(
    query: string,
    branchId?: string,
    signal?: AbortSignal,
    searchRequestId?: string
  ): Promise<SemanticSearchResponse> {
    const res = await api.get('/api/v1/recommendations/semantic-search', {
      params: { q: query, sessionId: await getOrGenerateGuestSessionId(), searchRequestId, ...(branchId ? { branchId } : {}) },
      signal,
    })
    const data = unwrapNestResponse<SemanticSearchResponse>(res.data)
    if (!data || !Array.isArray(data.packages) || !Array.isArray(data.doctors) || !Array.isArray(data.branches)) {
      throw new Error('Kết quả tìm kiếm không hợp lệ. Vui lòng thử lại.')
    }
    return data
  },
}
