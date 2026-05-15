import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_VERSION = 1
const MAX_MESSAGES = 80

export const AI_CHAT_WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    'Chào bạn! Mình là trợ lý đặt lịch. Bạn cứ nói rõ nhu cầu khám, khoa muốn gặp, hoặc ngày giờ mong muốn — mình sẽ bám theo để gợi ý lịch phù hợp.',
}

export function getAiChatUserId(user) {
  return String(user?.id || user?._id || '').trim()
}

export function getAiChatStorageKey(userId) {
  return `fe_clinic_app.aichat.v${STORAGE_VERSION}:${String(userId || '').trim()}`
}

function normalizeMessage(m) {
  const role = String(m?.role || '').toLowerCase()
  const content = String(m?.content || '').trim()
  if (!content) return null
  if (role !== 'user' && role !== 'assistant') return null
  return { role, content }
}

function normalizeState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return {}
  const next = { ...state }
  delete next.confirm
  return next
}

export async function loadAiChatHistory(userId) {
  const id = String(userId || '').trim()
  if (!id) {
    return { messages: [AI_CHAT_WELCOME_MESSAGE], state: {} }
  }

  const raw = await AsyncStorage.getItem(getAiChatStorageKey(id))
  if (!raw) {
    return { messages: [AI_CHAT_WELCOME_MESSAGE], state: {} }
  }

  try {
    const parsed = JSON.parse(raw)
    const messages = (Array.isArray(parsed?.messages) ? parsed.messages : [])
      .map(normalizeMessage)
      .filter(Boolean)
      .slice(-MAX_MESSAGES)

    return {
      messages: messages.length ? messages : [AI_CHAT_WELCOME_MESSAGE],
      state: normalizeState(parsed?.state),
    }
  } catch {
    return { messages: [AI_CHAT_WELCOME_MESSAGE], state: {} }
  }
}

export async function saveAiChatHistory(userId, { messages, state }) {
  const id = String(userId || '').trim()
  if (!id) return

  const normalizedMessages = (Array.isArray(messages) ? messages : [])
    .map(normalizeMessage)
    .filter(Boolean)
    .slice(-MAX_MESSAGES)

  const payload = {
    version: STORAGE_VERSION,
    updatedAt: new Date().toISOString(),
    messages: normalizedMessages.length ? normalizedMessages : [AI_CHAT_WELCOME_MESSAGE],
    state: normalizeState(state),
  }

  try {
    await AsyncStorage.setItem(getAiChatStorageKey(id), JSON.stringify(payload))
  } catch {
    /* quota */
  }
}

export async function clearAiChatHistory(userId) {
  const id = String(userId || '').trim()
  if (!id) return
  await AsyncStorage.removeItem(getAiChatStorageKey(id))
}
