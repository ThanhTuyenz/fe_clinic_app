import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
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
  const { data: room, isLoading, error: roomError, refetch } = useQuery({
    queryKey: ['telehealth-room', appointmentId], queryFn: () => telehealthService.getRoom(appointmentId),
    enabled: Boolean(appointmentId && authenticated), retry: false,
  })
  const call = useTelehealthCall(appointmentId)
  const [chatOpen, setChatOpen] = useState(false)
  const [text, setText] = useState('')
  const chatRef = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const active = ['connecting', 'waiting', 'connected', 'disconnected'].includes(call.status)
  const canJoin = room && ['CONFIRMED', 'CHECKED_IN', 'IN_EXAMINATION'].includes(room.status)
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
      <Text style={styles.controlLabel}>{label}</Text>
    </TouchableOpacity>
  )

  return (
    <ScreenShell title="Tư vấn trực tuyến" showBackButton>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
              <View style={styles.videoArea}>
                {Video && call.remoteStream && !call.peerVideoOff
                  ? <Video streamURL={call.remoteStream.toURL()} style={StyleSheet.absoluteFill} objectFit="contain" />
                  : <View style={styles.waiting}><Ionicons name="person-circle-outline" size={72} color="#94a3b8" />
                    <Text style={styles.waitingText}>{call.peerVideoOff ? 'Bác sĩ đang tắt camera' : statusText[call.status]}</Text></View>}
                {Video && call.localStream && !call.videoOff && <Video mirror streamURL={call.localStream.toURL()} style={styles.preview} objectFit="cover" zOrder={1} />}
              </View>
              {chatOpen && <View style={styles.chat}>
                <ScrollView ref={chatRef} onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: true })} keyboardShouldPersistTaps="handled">
                  {call.messages.length === 0 && <Text style={styles.subtitle}>Chưa có tin nhắn trong phiên tư vấn.</Text>}
                  {call.messages.map((message, index) => <View key={`${message.timestamp}-${index}`} style={styles.message}>
                    <Text style={styles.sender}>{message.senderName}</Text><Text style={styles.messageText}>{message.text}</Text>
                  </View>)}
                </ScrollView>
                <View style={styles.inputRow}><TextInput style={styles.input} placeholder="Nhắn cho bác sĩ…" value={text} onChangeText={setText} maxLength={2000} />
                  <TouchableOpacity accessibilityLabel="Gửi tin nhắn" disabled={!text.trim() || !['waiting', 'connected'].includes(call.status)}
                    onPress={() => { call.sendMessage(text); setText('') }} style={styles.send}><Ionicons name="send" size={21} color="#28a745" /></TouchableOpacity></View>
              </View>}
              <View style={styles.controls}>
                {control(call.audioMuted ? 'mic-off' : 'mic', call.audioMuted ? 'Bật mic' : 'Tắt mic', call.toggleAudio, call.audioMuted)}
                {control(call.videoOff ? 'videocam-off' : 'videocam', 'Camera', call.toggleVideo, call.videoOff)}
                {control('camera-reverse', 'Đổi cam', call.switchCamera)}
                {control('chatbubble-ellipses', 'Chat', () => setChatOpen(!chatOpen), chatOpen)}
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Rời phòng tư vấn" style={[styles.join, styles.endButton]} onPress={() => {
                Alert.alert('Rời phòng tư vấn?', 'Camera và micro sẽ tắt. Bạn có thể vào lại nếu buổi tư vấn chưa kết thúc.', [
                  { text: 'Ở lại', style: 'cancel' }, { text: 'Rời phòng', onPress: call.leave },
                ])
              }}><Text style={styles.joinText}>Rời phòng</Text></TouchableOpacity>
            </> : <View style={styles.lobby}>
              <Ionicons name={call.status === 'finished' ? 'checkmark-circle-outline' : 'videocam-outline'} size={62} color="#28a745" />
              <Text style={styles.title}>{call.status === 'finished' ? 'Đã hoàn tất buổi tư vấn' : 'Tư vấn video cùng bác sĩ'}</Text>
              <Text style={styles.description}>{call.status === 'finished' ? 'Thông tin phiên tư vấn đã được lưu. Bạn có thể quay về danh sách lịch hẹn.' : 'Cho phép camera và micro khi vào phòng. Chọn nơi yên tĩnh và giữ kết nối mạng ổn định.'}</Text>
              {canJoin && call.status !== 'finished' && <TouchableOpacity style={styles.join} onPress={call.join}><Text style={styles.joinText}>{call.status === 'error' ? 'Vào lại phòng' : 'Vào phòng tư vấn'}</Text></TouchableOpacity>}
              {!canJoin && call.status !== 'finished' && <Text style={styles.error}>Lịch hẹn chưa được xác nhận hoặc đã kết thúc.</Text>}
              <TouchableOpacity onPress={() => router.replace('/(tabs)/appointments')} style={{ padding: 16 }}><Text style={styles.settings}>Về lịch hẹn của tôi</Text></TouchableOpacity>
            </View>}
          </>}
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  statusBar: { backgroundColor: 'white', paddingHorizontal: 16, paddingVertical: 8 }, title: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', lineHeight: 20 }, status: { fontSize: 12, lineHeight: 18, color: '#475569', fontWeight: '500' },
  lobby: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  description: { fontSize: 14, lineHeight: 22, color: '#64748b', textAlign: 'center' },
  join: { backgroundColor: '#28a745', borderRadius: 12, padding: 15, alignItems: 'center', alignSelf: 'stretch' },
  joinText: { color: 'white', fontSize: 15, fontWeight: '700' }, endButton: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#dc2626' },
  errorBox: { padding: 12, backgroundColor: '#fff1f2' }, error: { color: '#be123c', fontSize: 13, lineHeight: 20 }, settings: { color: '#2563eb', fontSize: 13, paddingTop: 6 },
  videoArea: { flex: 1, minHeight: 160, backgroundColor: '#0f172a', position: 'relative' },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 }, waitingText: { color: '#cbd5e1', textAlign: 'center' },
  preview: { position: 'absolute', right: 12, top: 12, width: 100, height: 140, backgroundColor: '#334155', borderRadius: 12 },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', backgroundColor: '#0f172a', paddingVertical: 14, marginBottom: 12 },
  control: { alignItems: 'center', justifyContent: 'center', gap: 5, minWidth: 64, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#334155' },
  selected: { backgroundColor: '#475569' }, danger: { backgroundColor: '#dc2626' }, controlLabel: { color: 'white', fontSize: 11 },
  chat: { height: 210, padding: 12, backgroundColor: 'white' }, message: { paddingVertical: 6 }, sender: { fontSize: 12, fontWeight: '700', color: '#28a745' },
  messageText: { fontSize: 14, color: '#334155', lineHeight: 20 }, inputRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  input: { flex: 1, backgroundColor: '#f1f5f9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }, send: { padding: 12 },
})
