import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { recommendationService } from '../services/recommendationService'
import { analyticsEventId } from '../services/searchAnalytics'

export function useSemanticSearch(value: string, branchId?: string) {
  const query = value.trim()
  const [debounced, setDebounced] = useState('')
  const execution = useRef<{ key: string; id: string } | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 400)
    return () => clearTimeout(timer)
  }, [query])
  const valid = query.length >= 2 && query.length <= 200
  const current = valid && query === debounced
  const search = useQuery({
    queryKey: ['semantic-search', debounced, branchId || 'all'],
    queryFn: ({ signal }) => {
      const key = JSON.stringify([debounced, branchId || 'all'])
      if (execution.current?.key !== key) execution.current = { key, id: analyticsEventId() }
      return recommendationService.semanticSearch(debounced, branchId, signal, execution.current.id)
    },
    enabled: current,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: false,
  })
  return {
    results: current ? search.data ?? null : null,
    isSearching: valid && (!current || search.isFetching),
    error: query.length > 200 ? 'Vui lòng nhập tối đa 200 ký tự.'
      : current && search.isError ? 'Không thể tải kết quả tìm kiếm. Vui lòng thử lại.' : null,
    retry: () => { execution.current = null; return search.refetch() },
  }
}
