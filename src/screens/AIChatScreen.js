import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { aiChat } from '../api/ai.js'
import { isMongoObjectId } from '../api/doctors.js'
import DoctorAvatar from '../components/DoctorAvatar.js'
import MessageBanner from '../components/MessageBanner.js'
import {
  AI_CHAT_WELCOME_MESSAGE,
  clearAiChatHistory,
  getAiChatUserId,
  loadAiChatHistory,
  saveAiChatHistory,
} from '../lib/aiChatHistory.js'
import { getSession } from '../lib/session.js'
import { getDoctorFullName, getUserDisplayName } from '../lib/user.js'
import { colors } from '../theme/colors.js'

function asText(x) {
  return String(x == null ? '' : x)
}

function suggestedDoctorName(d) {
  const n = String(d?.name || '').trim()
  if (n) return n
  return getDoctorFullName(d) || 'Bác sĩ'
}

function doctorForAvatar(d) {
  const name = suggestedDoctorName(d)
  return { ...d, displayName: d.displayName || name }
}

function getSuggestedDoctorIntro(d) {
  const bio = String(d?.bio || '').trim()
  if (bio) {
    const compact = bio.replace(/\s+/g, ' ')
    return compact.length > 160 ? `${compact.slice(0, 157)}…` : compact
  }
  const spec = String(d?.specialty || d?.specialtyName || '').trim()
  if (spec) return `Chuyên khoa ${spec}.`
  return 'Chọn để xem lịch và đặt khám.'
}

function normalizeSuggestedDoctor(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = String(raw.id || raw._id || '').trim()
  if (!id || !isMongoObjectId(id)) return null
  return {
    ...raw,
    id,
    name: suggestedDoctorName(raw),
    specialty: String(raw.specialty || raw.specialtyName || '').trim(),
    deptName: String(raw.deptName || raw.departmentName || '').trim(),
    deptId: String(raw.deptId || raw.departmentId || '').trim(),
  }
}

export default function AIChatScreen({ navigation }) {
  const [, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([AI_CHAT_WELCOME_MESSAGE])
  const [state, setState] = useState({})
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [historyReady, setHistoryReady] = useState(false)
  const listRef = useRef(null)
  const insets = useSafeAreaInsets()

  const scrollToLatest = useCallback((animated = true) => {
    const run = () => listRef.current?.scrollToEnd({ animated })
    requestAnimationFrame(() => {
      run()
      requestAnimationFrame(run)
      setTimeout(run, 60)
      setTimeout(run, 220)
    })
  }, [])

  const patientId = getAiChatUserId(user)

  const suggestedDoctors = (Array.isArray(state?.suggestedDoctors) ? state.suggestedDoctors : [])
    .map(normalizeSuggestedDoctor)
    .filter(Boolean)
  const draftSpecialty = asText(state?.specialty).trim()
  const draftDate = asText(state?.appointmentDate).slice(0, 10)

  function bookWithSuggestedDoctor(doctor) {
    const id = String(doctor?.id || '').trim()
    if (!id) return
    const merged = { ...doctor, displayName: suggestedDoctorName(doctor) }

    if (/^\d{4}-\d{2}-\d{2}$/.test(draftDate)) {
      navigation.navigate('ChooseAppointmentSlot', {
        doctorId: id,
        doctor: merged,
        appointmentDate: draftDate,
      })
      return
    }
    navigation.navigate('ChooseAppointmentDate', { doctorId: id, doctor: merged })
  }

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

  useEffect(() => {
    scrollToLatest(true)
  }, [messages, busy, suggestedDoctors.length, error, scrollToLatest])

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
    scrollToLatest(true)
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

  function handleClear() {
    Alert.alert('Xóa hội thoại?', 'Nội dung trên thiết bị sẽ được xóa và trợ lý bắt đầu lại từ đầu.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          await clearAiChatHistory(patientId)
          setMessages([AI_CHAT_WELCOME_MESSAGE])
          setState({})
        },
      },
    ])
  }

  const keyboardOffset = Platform.OS === 'ios' ? insets.top + 12 : 0

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="sparkles" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.headerTextBlock}>
            <Text style={styles.title}>Trợ lý AI</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              Xin chào {getUserDisplayName(user) || 'bạn'} · Gợi ý đặt lịch nhanh
            </Text>
          </View>
          <Pressable onPress={handleClear} style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
            <Ionicons name="trash-outline" size={22} color={colors.textMuted} />
          </Pressable>
        </View>
        <View style={styles.hintPill}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primaryDark} />
          <Text style={styles.hintPillText}>Mô phỏng tư vấn — không thay cho chẩn đoán y khoa.</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={keyboardOffset}
      >
        <View style={styles.chatCanvas}>
          <View style={styles.bannerWrap}>
            <MessageBanner message={error} />
          </View>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(_, index) => String(index)}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={(_w, _h) => scrollToLatest(true)}
            ListFooterComponent={
              <View>
                {busy ? (
                  <View style={styles.typingRow}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.typingText}>Đang gợi ý khoa và bác sĩ…</Text>
                  </View>
                ) : null}
                {suggestedDoctors.length ? (
                  <View style={styles.suggestSection}>
                    <View style={styles.suggestSectionHead}>
                      <Ionicons name="people" size={18} color={colors.primaryDark} />
                      <Text style={styles.suggestSectionTitle}>Bác sĩ gợi ý — chọn để đặt lịch</Text>
                    </View>
                    {(draftSpecialty || draftDate) ? (
                      <View style={styles.suggestContext}>
                        {draftSpecialty ? (
                          <Text style={styles.suggestContextText}>
                            <Text style={styles.suggestContextBold}>Khoa: </Text>
                            {draftSpecialty}
                          </Text>
                        ) : null}
                        {draftDate ? (
                          <Text style={styles.suggestContextText}>
                            <Text style={styles.suggestContextBold}>Ngày: </Text>
                            {draftDate}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    {suggestedDoctors.map((d) => (
                      <View key={d.id} style={styles.doctorCard}>
                        <View style={styles.doctorCardTop}>
                          <DoctorAvatar doctor={doctorForAvatar(d)} size={52} />
                          <View style={styles.doctorCardMeta}>
                            <Text style={styles.doctorName}>{d.name}</Text>
                            {d.specialty ? <Text style={styles.doctorSpec}>{d.specialty}</Text> : null}
                            {d.deptName ? <Text style={styles.doctorDept}>{d.deptName}</Text> : null}
                          </View>
                        </View>
                        <Text style={styles.doctorBio}>{getSuggestedDoctorIntro(d)}</Text>
                        <Pressable
                          onPress={() => bookWithSuggestedDoctor(d)}
                          style={({ pressed }) => [styles.bookBtn, pressed && styles.bookBtnPressed]}
                        >
                          <Ionicons name="calendar-outline" size={18} color="#fff" />
                          <Text style={styles.bookBtnText}>Đặt lịch với bác sĩ</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            }
            renderItem={({ item }) => {
              const isUser = item.role === 'user'
              return (
                <View style={[styles.row, isUser ? styles.rowUser : styles.rowAssistant]}>
                  <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                    <View style={styles.bubbleMeta}>
                      <Ionicons
                        name={isUser ? 'person' : 'chatbubble-ellipses'}
                        size={14}
                        color={isUser ? 'rgba(255,255,255,0.85)' : colors.primary}
                      />
                      <Text style={[styles.metaLabel, isUser && styles.metaLabelUser]}>
                        {isUser ? 'Bạn' : 'Trợ lý'}
                      </Text>
                    </View>
                    <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{item.content}</Text>
                  </View>
                </View>
              )
            }}
          />
        </View>

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputShell}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Hỏi triệu chứng, khoa, hoặc ngày khám mong muốn…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              multiline
              editable={!busy}
            />
          </View>
          <Pressable
            onPress={handleSend}
            disabled={busy || !draft.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (busy || !draft.trim()) && styles.sendBtnDisabled,
              pressed && !(busy || !draft.trim()) && styles.sendBtnPressed,
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.brandBlueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pageCanvas,
  },
  iconBtnPressed: {
    opacity: 0.85,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.infoBg,
  },
  hintPillText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.primaryDark,
  },
  chatCanvas: {
    flex: 1,
    backgroundColor: colors.pageCanvas,
  },
  bannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 20,
    gap: 4,
    flexGrow: 1,
  },
  row: {
    width: '100%',
    marginBottom: 12,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '90%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
      android: { elevation: 3 },
    }),
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    color: colors.textMuted,
  },
  metaLabelUser: {
    color: 'rgba(255,255,255,0.9)',
  },
  bubbleText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  userBubbleText: {
    color: '#fff',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  inputShell: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.pageCanvas,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  input: {
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnDisabled: {
    backgroundColor: '#94a3b8',
    opacity: 0.65,
  },
  sendBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    marginBottom: 8,
  },
  typingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  suggestSection: {
    marginTop: 8,
    marginBottom: 16,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  suggestSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  suggestSectionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  suggestContext: {
    backgroundColor: colors.infoBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 4,
  },
  suggestContextText: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  suggestContextBold: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  doctorCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  doctorCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  doctorCardMeta: {
    flex: 1,
    minWidth: 0,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  doctorSpec: {
    fontSize: 13,
    color: colors.primaryDark,
    marginTop: 2,
    fontWeight: '600',
  },
  doctorDept: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  doctorBio: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: 10,
  },
  bookBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
  },
  bookBtnPressed: {
    backgroundColor: colors.primaryDark,
  },
  bookBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
