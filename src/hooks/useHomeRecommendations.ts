import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { patientProfileService } from '../services/patientProfileService'
import { recommendationService } from '../services/recommendationService'
export function useHomeRecommendations(userId?: string, isAuthenticated = false, sessionId?: string, ready = true) {
  const [selection, setSelection] = useState<{ userId?: string; profileId: string }>()
  const profiles = useQuery({ queryKey: ['patientProfiles', userId], queryFn: () => patientProfileService.getPatientProfiles(), enabled: ready && isAuthenticated, staleTime: 60_000 })
  const list = isAuthenticated ? profiles.data || [] : []
  const profileId = (selection && selection.userId === userId && list.some(item => item.id === selection.profileId) ? selection.profileId : '') || list.find(item => item.isMainProfile || item.relationshipToAccount === 'SELF')?.id || list[0]?.id
  const profile = useQuery({
    queryKey: ['recommendations', 'profile', userId, sessionId, profileId],
    queryFn: () => recommendationService.getProfileRecommendations(profileId!, sessionId),
    enabled: ready && isAuthenticated && Boolean(profileId) && profiles.isSuccess,
    staleTime: 60_000,
    refetchInterval: query => query.state.data?.status === 'PENDING' && query.state.dataUpdateCount < 12 ? 10_000 : false,
  })
  const behavior = useQuery({
    queryKey: ['recommendations', 'behavior', isAuthenticated ? userId : 'guest', sessionId],
    queryFn: () => recommendationService.getBehaviorRecommendations(sessionId),
    enabled: ready && Boolean(sessionId),
    staleTime: 0,
  })
  const refresh = useMutation({ mutationFn: async () => {
    if (!ready || !isAuthenticated || !profileId) return
    await recommendationService.refreshProfileRecommendations(profileId)
    await profile.refetch({ throwOnError: true })
  } })
  const refetch = () => Promise.all([
    ...(isAuthenticated && profileId ? [profile.refetch()] : []),
    ...(ready && sessionId ? [behavior.refetch()] : []),
  ])
  return { profile, behavior, refetch, profiles: list, profileId, selectProfile: (id: string) => setSelection({ userId, profileId: id }), refresh: () => refresh.mutate(), refreshing: refresh.isPending, refreshError: refresh.error, profilesError: profiles.error, loadingProfiles: isAuthenticated && profiles.isLoading, retryProfiles: profiles.refetch }
}
