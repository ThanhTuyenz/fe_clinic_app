import { useEffect, useState } from 'react'
import { getOrGenerateGuestSessionId } from '../utils/analyticsSession'

export function useAnalyticsSession() {
  const [sessionId, setSessionId] = useState<string>()
  useEffect(() => {
    let active = true
    void getOrGenerateGuestSessionId().then(id => { if (active) setSessionId(id) })
    return () => { active = false }
  }, [])
  return sessionId
}
