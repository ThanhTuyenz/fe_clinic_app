import AsyncStorage from '@react-native-async-storage/async-storage'
const KEY = 'vitacare_mobile_guest_session_id'
let pending: Promise<string> | undefined
export function getOrGenerateGuestSessionId(): Promise<string> {
  return pending ||= (async () => {
    const saved = await AsyncStorage.getItem(KEY).catch(() => null)
    if (saved && saved.length >= 16) return saved
    const id = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`
    await AsyncStorage.setItem(KEY, id).catch(() => {})
    return id
  })()
}
