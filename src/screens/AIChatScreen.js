import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { aiChat } from '../api/ai.js'
import MessageBanner from '../components/MessageBanner.js'
import {
  AI_CHAT_WELCOME_MESSAGE,
  clearAiChatHistory,
  getAiChatUserId,
  loadAiChatHistory,
  saveAiChatHistory,
} from '../lib/aiChatHistory.js'
import { getSession } from '../lib/session.js'
import { getUserDisplayName } from '../lib/user.js'
import { colors } from '../theme/colors.js'

export default function AIChatScreen({ navigation }) {
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([AI_CHAT_WELCOME_MESSAGE])
  const [state, setState] = useState({})
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const listRef = useRef(null)

  const patientId = getAiChatUserId(user)

  const bootstrap = useCallback(async () => {
    setError('')
    const session = await getSession()
    if (!session.token) {
      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để dùng trợ lý AI.' })
      return
    }
    setToken(session.token)
    setUser(session.user)
    const history = await loadAiChatHistory(getAiChatUserId(session.user))
    setMessages(history.messages)
    setState(history.state)
    setHistoryReady(true)
  }, [navigation])

  useFocusEffect(
    useCallback(() => {
      bootstrap()
    }, [bootstrap]),
  )

  useEffect(() => {
    if (!historyReady || !patientId) return
    saveAiChatHistory(patientId, { messages, state })
  }, [historyReady, messages, patientId, state])

  async function handleSend() {
    const content = draft.trim()
    if (!content || busy) return
    const session = await getSession()
    if (!session.token) {
      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để dùng trợ lý AI.' })
      return
    }
    const authToken = session.token
    setToken(authToken)
    setUser(session.user)
    setDraft('')
    setError('')
    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setBusy(true)
    const controller = new AbortController()
    const timeoutMs = 120000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const data = await aiChat({
        token: authToken,
        messages: nextMessages,
        state,
        signal: controller.signal,
      })
      const assistant = data?.assistant
      if (assistant?.role && assistant?.content != null && String(assistant.content).trim()) {
        setMessages((prev) => [...prev, { role: assistant.role, content: String(assistant.content).trim() }])
      } else {
        const reply = String(data?.reply || data?.message || data?.answer || data?.text || '').trim()
        if (reply) {
          setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
        } else {
          setError('Máy chủ không trả nội dung trả lời. Kiểm tra backend (route /api/ai/chat và khóa dịch vụ AI).')
        }
      }
      if (data?.state && typeof data.state === 'object') {
        setState(data.state)
      }
    } catch (err) {
      setError(err.message || 'Không gọi được trợ lý AI.')
    } finally {
      clearTimeout(timeoutId)
      setBusy(false)
    }
  }

  async function handleClear() {
    await clearAiChatHistory(patientId)
    setMessages([AI_CHAT_WELCOME_MESSAGE])
    setState({})
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Trợ lý AI</Text>
        <Text style={styles.subtitle}>Xin chào {getUserDisplayName(user) || 'bạn'}</Text>
        <Pressable onPress={handleClear}>
          <Text style={styles.clear}>Xóa hội thoại</Text>
        </Pressable>
      </View>
      <MessageBanner message={error} />
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isUser = item.role === 'user'
          return (
            <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{item.content}</Text>
            </View>
          )
        }}
      />
      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Nhập câu hỏi hoặc yêu cầu đặt lịch…"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          multiline
          editable={!busy}
        />
        <Pressable onPress={handleSend} disabled={busy || !draft.trim()} style={styles.send}>
          <Text style={styles.sendText}>{busy ? '…' : 'Gửi'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginTop: 4,
  },
  clear: {
    marginTop: 8,
    color: colors.primary,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 10,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '88%',
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    color: colors.text,
    lineHeight: 21,
  },
  userBubbleText: {
    color: '#fff',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  send: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sendText: {
    color: '#fff',
    fontWeight: '700',
  },
})
