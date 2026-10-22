import { useCallback, useEffect, useRef, type ElementRef } from 'react'
import { AppState, useWindowDimensions, View } from 'react-native'
import { useIsFocused } from 'expo-router'
import { searchAnalytics } from '../services/searchAnalytics'

type ViewInstance = ElementRef<typeof View>
type Measurable = Pick<ViewInstance, 'measureInWindow'>

export function useRecommendationImpressions(items: { packageId: string }[], token?: string) {
  const focused = useIsFocused()
  const { width, height } = useWindowDimensions()
  const containerRef = useRef<ViewInstance>(null)
  const cards = useRef(new Map<string, { node: Measurable; position: number }>())
  const receipt = useRef({ token, sent: new Set<string>() })
  const register = useCallback((id: string, position: number, node: Measurable | null) => {
    if (node) cards.current.set(id, { node, position })
    else cards.current.delete(id)
  }, [])

  useEffect(() => {
    if (receipt.current.token !== token) receipt.current = { token, sent: new Set() }
    if (!token || !focused || items.length === 0) return
    const sent = receipt.current.sent
    let active = true
    let measuring = false
    let timer: ReturnType<typeof setInterval> | undefined
    const done = () => items.every(item => sent.has(item.packageId))
    const stop = () => { if (timer !== undefined) clearInterval(timer); timer = undefined }
    const foreground = () => active && AppState.currentState === 'active'

    const measure = () => {
      if (!foreground() || measuring || done()) return
      measuring = true
      // One offscreen section check avoids measuring every card while scrolling elsewhere.
      containerRef.current?.measureInWindow((x, y, w, h) => {
        measuring = false
        if (!foreground() || x >= width || x + w <= 0 || y >= height || y + h <= 0) return
        cards.current.forEach(({ node, position }, id) => {
          if (sent.has(id)) return
          node.measureInWindow((cardX, cardY, cardW, cardH) => {
            if (!foreground() || sent.has(id) || cardW <= 0 || cardH <= 0) return
            const visibleWidth = Math.max(0, Math.min(cardX + cardW, width) - Math.max(0, cardX))
            const visibleHeight = Math.max(0, Math.min(cardY + cardH, height) - Math.max(0, cardY))
            if (visibleWidth * visibleHeight < cardW * cardH * 0.5) return
            sent.add(id)
            void searchAnalytics.recommendation('RECOMMEND_IMPRESSION', token, id, position).catch(() => {})
            if (done()) stop()
          })
        })
      })
      if (!containerRef.current) measuring = false
    }
    const resume = () => {
      stop()
      if (!foreground() || done()) return
      timer = setInterval(measure, 500)
      measure()
    }
    const subscription = AppState.addEventListener('change', resume)
    resume()
    return () => { active = false; stop(); subscription.remove() }
  }, [items, token, focused, width, height])

  return { containerRef, register }
}
