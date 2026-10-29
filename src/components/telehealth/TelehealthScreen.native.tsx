import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { usePreventRemove, useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ScreenShell } from '../common/ScreenShell'
import { useAuthStore } from '../../store/useAuthStore'
import { useTelehealthCall } from '../../hooks/useTelehealthCall'
import { telehealthService } from '../../services/telehealthService'

const statusText = {
  idle: 'Sẵn sàng vào phòng', connecting: 'Đang kết nối cuộc gọi…', waiting: 'Đang chờ bác sĩ vào phòng',
  connected: 'Đã kết nối với bác sĩ', disconnected: 'Kết nối đang gián đoạn…', finished: 'Buổi tư vấn đã kết thúc', error: 'Chưa kết nối được cuộc gọi',
}

export function TelehealthScreen({ appointmentId }: { appointmentId: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const authenticated = useAuthStore(state => state.isAuthenticated)
  const currentUserId = useAuthStore(state => state.user?.id)
  const { data: room, isLoading, error: roomError, refetch } = useQuery({
    queryKey: ['telehealth-room', appointmentId], queryFn: () => telehealthService.getRoom(appointmentId),
    enabled: Boolean(appointmentId && authenticated), retry: false,
  })
  const call = useTelehealthCall(appointmentId)
  const [chatOpen, setChatOpen] = useState(false)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const sendingRef = useRef(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [availableHeight, setAvailableHeight] = useState(0)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const containerRef = useRef<React.ComponentRef<typeof View>>(null)
  const chatRef = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const active = ['connecting', 'waiting', 'connected', 'disconnected'].includes(call.status)
  const canJoin = room && ['CONFIRMED', 'CHECKED_IN', 'IN_EXAMINATION'].includes(room.status)
  const compact = chatOpen && (keyboardVisible || (availableHeight > 0 && availableHeight < 480))
  const hideVideo = compact && availableHeight > 0 && availableHeight < 320
  const canSend = !sending && Boolean(text.trim()) && ['waiting', 'connected'].includes(call.status)
  const scrollChatToEnd = () => chatRef.current?.scrollToEnd({ animated: true })
  const closeChat = () => { Keyboard.dismiss(); setChatOpen(false) }
  const sendMessage = async () => {
    if (!canSend || sendingRef.current) return
    sendingRef.current = true
    setSending(true)
    const submittedText = text
    try {
      await call.sendMessage(submittedText)
      setText(current => current === submittedText ? '' : current)
    } catch (error) {
      Alert.alert('Chưa gửi được tin nhắn', error instanceof Error ? error.message : 'Vui lòng thử lại.')
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }
  const confirmLeave = () => {
    Alert.alert('Rời phòng tư vấn?', 'Camera và micro sẽ tắt. Bạn có thể vào lại nếu buổi tư vấn chưa kết thúc.', [
      { text: 'Ở lại', style: 'cancel' }, { text: 'Rời phòng', style: 'destructive', onPress: call.leave },
    ])
  }
  useEffect(() => {
    const shown = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true))
    const hidden = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false))
    return () => { shown.remove(); hidden.remove() }
  }, [])
  usePreventRemove(active, ({ repeat }) => {
    Alert.alert('Rời phòng tư vấn?', 'Camera và micro sẽ tắt. Bạn có thể vào lại nếu buổi tư vấn chưa kết thúc.', [
      { text: 'Ở lại', style: 'cancel' },
      { text: 'Rời phòng', onPress: () => { call.leave(); repeat() } },
    ])
  })
  useEffect(() => {
    if (call.status === 'finished') {
      void queryClient.invalidateQueries({ queryKey: ['myAppointments'] })
      void queryClient.invalidateQueries({ queryKey: ['telehealth-room', appointmentId] })
    }
  }, [call.status, appointmentId, queryClient])

  const Video = call.rtc?.RTCView
  const control = (icon: React.ComponentProps<typeof Ionicons>['name'], label: string, onPress: () => void, selected = false, danger = false) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={[styles.control, selected && styles.selected, danger && styles.danger]}>
      <Ionicons name={icon} size={23} color="white" />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.controlLabel}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <ScreenShell title="Tư vấn trực tuyến" showBackButton>
      <View ref={containerRef} style={styles.container} onLayout={() => {
        containerRef.current?.measureInWindow((_x, y) => setKeyboardOffset(y))
      }}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={keyboardOffset}>
        <View style={styles.container} onLayout={event => setAvailableHeight(event.nativeEvent.layout.height)}>
        {!authenticated ? <View style={styles.lobby}><Text style={styles.title}>Đăng nhập để vào phòng tư vấn</Text>
          <TouchableOpacity style={styles.join} onPress={() => router.push('/(auth)/login')}><Text style={styles.joinText}>Đăng nhập</Text></TouchableOpacity></View>
          : isLoading ? <ActivityIndicator style={{ marginTop: 40 }} color="#28a745" />
          : roomError || !room ? <View style={styles.lobby}><Text style={styles.error}>{roomError?.message || 'Không tìm thấy phòng tư vấn.'}</Text>
            <TouchableOpacity style={styles.join} onPress={() => { void refetch() }}><Text style={styles.joinText}>Thử lại</Text></TouchableOpacity></View>
          : <>
            <View style={styles.statusBar}>
              <Text style={styles.status}>{statusText[call.status]}</Text>
            </View>
            {call.error ? <View style={styles.errorBox}><Text style={styles.error}>{call.error}</Text>
              {!active && <TouchableOpacity onPress={() => { void Linking.openSettings() }}><Text style={styles.settings}>Mở cài đặt quyền camera/micro</Text></TouchableOpacity>}
            </View> : null}
            {active ? <>
              <View style={[styles.videoArea, chatOpen && styles.videoWithChat, compact && styles.compactVideo, hideVideo && styles.hiddenVideo]}>
                {!hideVideo && <>
                {Video && call.remoteStream && !call.peerVideoOff
                  ? <Video streamURL={call.remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="contain" />
                  : <View style={styles.waiting}><Ionicons name="person-circle-outline" size={72} color="#94a3b8" />
                    <Text style={styles.waitingText}>{call.peerVideoOff ? 'Bác sĩ đang tắt camera' : statusText[call.status]}</Text></View>}
                {Video && call.localStream && !call.videoOff && <Video mirror streamURL={call.localStream.toURL()} style={[styles.preview, compact && styles.compactPreview]} objectFit="cover" zOrder={1} />}
                </>}
              </View>
              {chatOpen && <View style={styles.chat}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatTitle}>Tin nhắn với bác sĩ</Text>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng trò chuyện" onPress={closeChat} style={styles.closeChat}>
                    <Ionicons name="close" size={20} color="#475569" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent} ref={chatRef} onContentSizeChange={scrollChatToEnd} onLayout={scrollChatToEnd} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}>
                  {call.messages.length === 0 && <Text style={styles.subtitle}>Chưa có tin nhắn trong phiên tư vấn.</Text>}
                  {call.messages.map((message, index) => {
                    const isOwnMessage = currentUserId != null && String(message.senderId) === String(currentUserId)
                    return <View key={`${message.timestamp}-${index}`} style={[styles.message, isOwnMessage ? styles.ownMessage : styles.receivedMessage]}>
                      {!isOwnMessage && <Text style={styles.sender}>{message.senderName}</Text>}
                      <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>{message.text}</Text>
                    </View>
                  })}
                </ScrollView>
                <View style={styles.inputRow}><TextInput style={styles.input} placeholder="Nhắn cho bác sĩ…" placeholderTextColor="#64748b" selectionColor="#28a745" accessibilityLabel="Nội dung tin nhắn cho bác sĩ" value={text} onChangeText={setText} onFocus={() => setKeyboardVisible(true)} maxLength={2000} returnKeyType="send" submitBehavior="submit" onSubmitEditing={sendMessage} />
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Gửi tin nhắn" accessibilityState={{ disabled: !canSend }} disabled={!canSend}
                    onPress={sendMessage} style={[styles.send, !canSend && styles.sendDisabled]}><Ionicons name="send" size={21} color={canSend ? '#ffffff' : '#94a3b8'} /></TouchableOpacity></View>
              </View>}
              <View style={styles.controls}>
                {control(call.audioMuted ? 'mic-off' : 'mic', call.audioMuted ? 'Bật mic' : 'Tắt mic', call.toggleAudio, call.audioMuted)}
                {control(call.videoOff ? 'videocam-off' : 'videocam', 'Camera', call.toggleVideo, call.videoOff)}
                {control('camera-reverse', 'Đổi cam', call.switchCamera)}
                {control('chatbubble-ellipses', 'Chat', () => chatOpen ? closeChat() : setChatOpen(true), chatOpen)}
                {control('call', 'Rời phòng', confirmLeave, false, true)}
              </View>
            </> : <View style={styles.lobby}>
              <Ionicons name={call.status === 'finished' ? 'checkmark-circle-outline' : 'videocam-outline'} size={62} color="#28a745" />
              <Text style={styles.title}>{call.status === 'finished' ? 'Đã hoàn tất buổi tư vấn' : 'Tư vấn video cùng bác sĩ'}</Text>
              <Text style={styles.description}>{call.status === 'finished' ? 'Thông tin phiên tư vấn đã được lưu. Bạn có thể quay về danh sách lịch hẹn.' : 'Cho phép camera và micro khi vào phòng. Chọn nơi yên tĩnh và giữ kết nối mạng ổn định.'}</Text>
              {canJoin && call.status !== 'finished' && <TouchableOpacity style={styles.join} onPress={call.join}><Text style={styles.joinText}>{call.status === 'error' ? 'Vào lại phòng' : 'Vào phòng tư vấn'}</Text></TouchableOpacity>}
              {!canJoin && call.status !== 'finished' && <Text style={styles.error}>Lịch hẹn chưa được xác nhận hoặc đã kết thúc.</Text>}
              <TouchableOpacity onPress={() => router.replace('/(tabs)/appointments')} style={{ padding: 16 }}><Text style={styles.settings}>Về lịch hẹn của tôi</Text></TouchableOpacity>
            </View>}
          </>}
        </View>
      </KeyboardAvoidingView>
      </View>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0 },
  statusBar: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8 }, title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', lineHeight: 20 }, status: { fontSize: 12, lineHeight: 18, color: '#475569', fontWeight: '500' },
  lobby: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  description: { fontSize: 14, lineHeight: 22, color: '#64748b', textAlign: 'center' },
  join: { backgroundColor: '#28a745', borderRadius: 12, padding: 15, alignItems: 'center', alignSelf: 'stretch' },
  joinText: { color: 'white', fontSize: 15, fontWeight: '700' },
  errorBox: { padding: 12, backgroundColor: '#fff1f2' }, error: { color: '#be123c', fontSize: 13, lineHeight: 20 }, settings: { color: '#2563eb', fontSize: 13, paddingTop: 6 },
  videoArea: { flex: 1, minHeight: 0, backgroundColor: '#0f172a', position: 'relative', overflow: 'hidden' },
  videoWithChat: { flex: 0.9 }, compactVideo: { flex: 0, height: 96 }, hiddenVideo: { height: 0 },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }, waitingText: { color: '#cbd5e1', textAlign: 'center' },
  preview: { position: 'absolute', right: 12, top: 12, width: 100, height: 140, backgroundColor: '#334155', borderRadius: 12 },
  compactPreview: { right: 8, top: 8, width: 56, height: 80 },
  controls: { flexShrink: 0, flexDirection: 'row', gap: 8, backgroundColor: '#0f172a', paddingVertical: 8, paddingHorizontal: 12 },
  control: { flex: 1, minWidth: 0, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 2, borderRadius: 10, backgroundColor: '#334155' },
  selected: { backgroundColor: '#475569' }, danger: { backgroundColor: '#dc2626' }, controlLabel: { color: 'white', fontSize: 11 },
  chat: { flex: 1.1, minHeight: 0, backgroundColor: 'white' },
  chatHeader: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 12, paddingRight: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0' },
  chatTitle: { flex: 1, fontSize: 12, fontWeight: '600', color: '#334155' }, closeChat: { width: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  messages: { flex: 1, minHeight: 0 }, messagesContent: { paddingHorizontal: 12, paddingVertical: 8 },
  message: { maxWidth: '85%', minWidth: 0, marginVertical: 4, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12 },
  ownMessage: { alignSelf: 'flex-end', backgroundColor: '#28a745', borderBottomRightRadius: 4 },
  receivedMessage: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', borderBottomLeftRadius: 4 },
  sender: { fontSize: 12, fontWeight: '700', color: '#15803d', marginBottom: 3 }, ownMessageText: { color: '#ffffff' },
  messageText: { fontSize: 14, color: '#334155', lineHeight: 20 }, inputRow: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e2e8f0' },
  input: { flex: 1, minWidth: 0, minHeight: 44, color: '#0f172a', fontSize: 14, backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  send: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#28a745' }, sendDisabled: { backgroundColor: '#f1f5f9' },
})
