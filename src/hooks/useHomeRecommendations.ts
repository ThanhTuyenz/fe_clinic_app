import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { patientProfileService } from '../services/patientProfileService'
import { recommendationService } from '../services/recommendationService'
export function useHomeRecommendations(userId?: string, isAuthenticated = false, sessionId?: string, ready = true) {
  const [selection, setSelection] = useState<{ userId?: string; profileId: string }>()
  const profiles = useQuery({ queryKey: ['patientProfiles', userId], queryFn: () => patientProfileService.getPatientProfiles(), enabled: ready && isAuthenticated, staleTime: 60_000 })
  const list = isAuthenticated ? profiles.data || [] : []
  const profileId = (selection && selection.userId === userId && list.some(item => item.id === selection.profileId) ? selection.profileId : '') || list.find(item => item.isMainProfile || item.relationshipToAccount === 'SELF')?.id || list[0]?.id
  const result = useQuery({ queryKey: ['homeRecommendations', userId, sessionId, profileId], queryFn: () => recommendationService.getHomeRecommendations({ sessionId, profileId: isAuthenticated ? profileId : undefined }), enabled: ready && Boolean(sessionId) && (!isAuthenticated || profiles.isSuccess), staleTime: 60_000 })
  const refresh = useMutation({ mutationFn: async () => { if (isAuthenticated && profileId) await recommendationService.refreshProfileRecommendations(profileId); await result.refetch({ throwOnError: true }) } })
  return { ...result, profiles: list, profileId, selectProfile: (id: string) => setSelection({ userId, profileId: id }), refresh: () => refresh.mutate(), refreshing: refresh.isPending, refreshError: refresh.error, profilesError: profiles.error, loadingProfiles: isAuthenticated && profiles.isLoading, retryProfiles: profiles.refetch }
}
