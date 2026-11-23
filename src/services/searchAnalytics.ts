import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppState } from 'react-native'
import { api, unwrapNestResponse } from './api'
import { getOrGenerateGuestSessionId } from '../utils/analyticsSession'

type Target = 'PACKAGE' | 'DOCTOR' | 'BRANCH'
interface Source { searchId?: string; sourceViewId?: string; analyticsSessionId: string; at: number; branchId?: string }
interface Event { id: string; sessionId: string; searchId?: string; recommendationToken?: string; eventType: 'RESULT_CLICK' | 'PACKAGE_VIEW' | 'RECOMMEND_IMPRESSION' | 'RECOMMEND_CLICK'; targetType: Target; targetId: string; position?: number; branchId?: string; at: number }
interface RecommendationSource extends Source { pendingClickId?: string }
interface Stored { events: Event[]; clicks: Record<string, Source>; views: Record<string, Source>; recommendations: Record<string, RecommendationSource> }
const KEY = 'vitacare_search_analytics_v1'
const TTL = 24 * 3600_000
let writes: Promise<unknown> = Promise.resolve()
let flushing: Promise<void> | undefined
let retry: ReturnType<typeof setTimeout> | undefined
let started = false
const ensuring = new Map<string, Promise<void>>()
export const analyticsEventId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
  const value = Math.floor(Math.random() * 16)
  return (char === 'x' ? value : (value & 3) | 8).toString(16)
})
async function read(): Promise<Stored> {
  const raw = await AsyncStorage.getItem(KEY)
  const value = raw ? JSON.parse(raw) : {}
  const prune = <T extends Source>(items: Record<string, T> = {}) => Object.fromEntries(Object.entries(items).filter(([, source]) => source.at > Date.now() - TTL))
  return { events: Array.isArray(value.events) ? value.events.filter((event: Event) => event.at > Date.now() - TTL) : [], clicks: prune(value.clicks), views: prune(value.views), recommendations: prune(value.recommendations) }
}
function mutate(update: (value: Stored) => void) {
  const job = writes.then(async () => { const value = await read(); update(value); await AsyncStorage.setItem(KEY, JSON.stringify(value)) })
  writes = job.catch(() => {})
  return job
}
async function flush() {
  if (flushing) return flushing
  flushing = (async () => {
    await writes
    const { events } = await read()
    await Promise.all(events.slice(-10).map(async event => {
      try {
        const { at: _at, ...payload } = event
        const response = await api.post('/api/v1/analytics/interactions', { ...payload, occurredAt: new Date(event.at).toISOString() }, { timeout: 3000 })
        const result = unwrapNestResponse<{ sourceViewId?: string }>(response.data)
        await mutate(value => {
          value.events = value.events.filter(item => item.id !== event.id)
          const source = value.recommendations[event.targetId]
          if (event.eventType === 'RECOMMEND_CLICK' && source?.pendingClickId === event.id && result?.sourceViewId) {
            source.sourceViewId = result.sourceViewId
            delete source.pendingClickId
          }
        })
      } catch (error) {
        const status = (error as { status?: number }).status
        if (status && [400, 403, 404, 422].includes(status)) await mutate(value => { value.events = value.events.filter(item => item.id !== event.id) })
      }
    }))
  })().catch(() => {}).finally(() => { flushing = undefined })
  return flushing
}
function schedule() {
  if (!started) {
    started = true
    AppState.addEventListener('change', state => { if (state === 'active') { void flush(); schedule() } })
  }
  void flush()
  if (!retry) retry = setTimeout(async () => {
    retry = undefined
    if (AppState.currentState === 'active' && (await read().catch(() => ({ events: [] }))).events.length) schedule()
  }, 15_000)
}
function active(source?: Source) { return source && source.at > Date.now() - TTL ? source : undefined }

export const searchAnalytics = {
  async recommendation(eventType: 'RECOMMEND_IMPRESSION' | 'RECOMMEND_CLICK', recommendationToken: string, targetId: string, position: number) {
    if (!recommendationToken) return
    const sessionId = await getOrGenerateGuestSessionId()
    const id = analyticsEventId(), at = Date.now()
    await mutate(value => {
      if (eventType === 'RECOMMEND_CLICK') value.recommendations[targetId] = { analyticsSessionId: sessionId, at, pendingClickId: id }
      value.events.push({ id, sessionId, eventType, recommendationToken, targetType: 'PACKAGE', targetId, position, at })
    })
    schedule()
  },
  async click(searchId: string | undefined, targetType: Target, targetId: string, position: number, branchId?: string) {
    if (!searchId) return
    const sessionId = await getOrGenerateGuestSessionId()
    const source = { searchId, analyticsSessionId: sessionId, at: Date.now(), branchId }
    await mutate(value => {
      value.clicks[`${targetType}:${targetId}`] = source
      value.events.push({ id: analyticsEventId(), sessionId, searchId, eventType: 'RESULT_CLICK', targetType, targetId, position, branchId, at: source.at })
    })
    schedule()
  },
  async view(packageId: string, branchId?: string, id = analyticsEventId()) {
    const sessionId = await getOrGenerateGuestSessionId()
    await mutate(value => {
      const click = active(value.clicks[`PACKAGE:${packageId}`])
      const source = { analyticsSessionId: sessionId, searchId: click?.searchId, sourceViewId: id, at: Date.now(), branchId }
      value.views[packageId] = source
      if (!value.events.some(event => event.id === id)) value.events.push({ id, sessionId, searchId: click?.searchId, eventType: 'PACKAGE_VIEW', targetType: 'PACKAGE', targetId: packageId, branchId, at: source.at })
    })
    schedule()
    return id
  },
  async ensureView(packageId: string, branchId?: string) {
    const key = `${packageId}:${branchId || ''}`
    if (ensuring.has(key)) return ensuring.get(key)
    const work = (async () => {
      await writes
      const existing = active((await read()).views[packageId])
      if (!existing || (branchId && existing.branchId !== branchId)) await this.view(packageId, branchId)
    })()
    ensuring.set(key, work)
    try { await work } finally { ensuring.delete(key) }
  },
  async checkoutSource(target: { packageId?: string; doctorId?: string; branchId?: string }) {
    await flush()
    await writes
    const value = await read().catch(() => ({ events: [], clicks: {}, views: {}, recommendations: {} } as Stored))
    const candidates = [target.packageId && active(value.clicks[`PACKAGE:${target.packageId}`]), target.doctorId && active(value.clicks[`DOCTOR:${target.doctorId}`]), target.branchId && active(value.clicks[`BRANCH:${target.branchId}`])]
      .filter((source): source is Source => !!source).sort((a, b) => b.at - a.at)
    const view = target.packageId ? active(value.views[target.packageId]) : undefined
    const recommendation = target.packageId ? active(value.recommendations[target.packageId]) : undefined
    const source = recommendation?.sourceViewId && (!candidates[0] || recommendation.at >= candidates[0].at) ? recommendation : candidates[0]
    return { analyticsSessionId: source?.analyticsSessionId || view?.analyticsSessionId, searchId: source?.searchId, sourceViewId: source?.sourceViewId || view?.sourceViewId }
  },
  flush,
  resume: schedule,
}
