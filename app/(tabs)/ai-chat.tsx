import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { aiService, type AiChatResponse, type ChatMessage } from '../../src/services/aiService'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useBookingStore } from '../../src/store/useBookingStore'
import { formatCurrencyVi } from '../../src/utils/date'
import { resolveDoctorAvatarUrl } from '../../src/services/doctorService'

const greeting: ChatMessage = {
  role: 'assistant',
  content: 'Xin chào! Tôi hỗ trợ tìm dịch vụ, bác sĩ, lịch trống và tra cứu lịch hẹn tại VitaCare. Tôi không tư vấn triệu chứng hay chẩn đoán bệnh.',
}
const suggestions = ['Tìm gói khám', 'Tìm bác sĩ tư vấn trực tuyến', 'Xem lịch đã đặt']

function DoctorResultCard({ doctor }: { doctor: NonNullable<AiChatResponse['doctors']>[number] }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const source = doctor.avatarUrl?.trim() || null
  const initials = doctor.fullName.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase()
  return <View className="mt-3 flex-row items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
    <View className="h-20 w-16 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
      {source && source !== failedUrl ? <Image source={{ uri: resolveDoctorAvatarUrl(source) }} accessibilityLabel={`Ảnh bác sĩ ${doctor.fullName}`} className="h-full w-full" resizeMode="cover" onError={() => setFailedUrl(source)} /> : <Text className="text-lg font-semibold text-slate-500">{initials || 'BS'}</Text>}
    </View>
    <View className="min-w-0 flex-1">
      <Text className="text-sm font-semibold leading-5 text-slate-900">{doctor.fullName}</Text>
      <Text className="mt-1 text-xs leading-5 text-slate-600">{doctor.specialtyName}</Text>
      <Text className="text-xs leading-5 text-slate-500">{doctor.branchName}</Text>
      <Text className="mt-2 text-sm font-semibold text-slate-900">{formatCurrencyVi(doctor.consultationFee)}</Text>
    </View>
  </View>
}

export default function AiChatScreen() {
  const router = useRouter()
  const userId = useAuthStore(state => state.user?.id)
  const [messages, setMessages] = useState<ChatMessage[]>([greeting])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [response, setResponse] = useState<AiChatResponse | null>(null)
  const sessionId = useRef<string | undefined>(undefined)
  const generation = useRef(0)
  const list = useRef<FlatList<ChatMessage>>(null)

  const reset = () => {
    generation.current++
    sessionId.current = undefined
    setMessages([greeting]); setResponse(null); setInput(''); setBusy(false)
  }
  useEffect(() => { reset() }, [userId])
  useEffect(() => () => { generation.current++ }, [])

  const accept = (data: AiChatResponse) => {
    sessionId.current = data.sessionId
    setResponse(data)
    setMessages(previous => [...previous, { role: 'assistant', content: data.message, data }])
  }

  const send = async (text = input) => {
    const message = text.trim()
    if (!message || busy) return
    const current = generation.current
    setInput(''); setBusy(true)
    setResponse(null)
    setMessages(previous => [...previous, { role: 'user', content: message }])
    try {
      const data = await aiService.sendMessage(message, sessionId.current)
      if (current === generation.current) accept(data)
    } catch (error) {
      if (current === generation.current) setMessages(previous => [...previous, {
        role: 'assistant', content: error instanceof Error ? error.message : 'Không kết nối được trợ lý AI. Vui lòng thử lại.',
      }])
    } finally { if (current === generation.current) setBusy(false) }
  }

  const continueBooking = () => {
    const proposal = response?.proposal
    if (!proposal || busy) return
    useBookingStore.getState().resetBooking()
    router.push({
      pathname: proposal.bookingMethodCode === 'ONLINE_CONSULTATION' ? '/booking/online'
        : proposal.bookingMethodCode === 'CONSULTATION' ? '/booking/doctor' : '/booking/specialty',
      params: {
        flow: proposal.bookingMethodCode === 'AFTER_HOURS' ? 'after-hours' : 'specialty',
        branchId: proposal.branchId, doctorId: proposal.doctorId, specialtyId: proposal.specialtyId || '',
        serviceId: proposal.servicePackageId || '', date: proposal.date.slice(0, 10),
        time: proposal.startTime, slotId: proposal.slotId,
      },
    })
  }

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View className={'mb-3 max-w-[92%] rounded-xl border border-slate-200 p-3 ' + (item.role === 'user' ? 'self-end bg-primary-50' : 'self-start bg-white')}>
      <Text className="text-sm leading-6 text-slate-800">{item.content}</Text>
      {item.data?.proposedPackages?.map(pkg => (
        <TouchableOpacity key={pkg.id} onPress={() => router.push({ pathname: '/package/[id]', params: { id: pkg.id } })} className="mt-2 rounded-lg border border-primary-100 p-3">
          <Text className="font-bold text-primary-700">{pkg.name}</Text>
          <Text className="text-xs text-slate-600">{formatCurrencyVi(pkg.price)} · Xem dịch vụ</Text>
        </TouchableOpacity>
      ))}
      {item.data?.doctors?.map(doctor => (
        <DoctorResultCard key={doctor.id} doctor={doctor} />
      ))}
    </View>
  )

  return (
    <ScreenShell title="Trợ lý đặt lịch VitaCare">
      <KeyboardAvoidingView className="flex-1 px-4" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity onPress={reset} disabled={busy} className="self-end py-2"><Text className="text-xs text-primary-700">Cuộc trò chuyện mới</Text></TouchableOpacity>
        <FlatList ref={list} data={messages} renderItem={renderMessage} keyExtractor={(_, index) => String(index)}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })} />
        {response?.proposal && (
          <View className="mb-2 rounded-xl border border-primary-200 bg-primary-50 p-3">
            <Text className="font-bold text-slate-800">{response.proposal.packageName || response.proposal.doctorName}</Text>
            <Text className="text-xs text-slate-600">{response.proposal.branchName} · {response.proposal.date} · {response.proposal.startTime}–{response.proposal.endTime}</Text>
            <Text className="mt-1 text-xs text-slate-600">Phí khám dự kiến: {formatCurrencyVi(response.proposal.fee)}</Text>
            <TouchableOpacity disabled={busy} onPress={continueBooking} className="mt-3 rounded-lg bg-primary-600 p-2">
              <Text className="text-center font-bold text-white">Tiếp tục đặt lịch</Text>
            </TouchableOpacity>
            <Text className="mt-2 text-xs text-slate-500">Kiểm tra lại lịch, chọn hồ sơ và xác nhận ở màn hình đặt lịch. Lịch chưa được giữ chỗ.</Text>
          </View>
        )}
        {busy && <ActivityIndicator className="my-2" color="#047857" />}
        {messages.length === 1 && suggestions.map(text => <TouchableOpacity key={text} disabled={busy} onPress={() => { void send(text) }} className="mb-2 rounded-lg border border-slate-200 p-2"><Text className="text-xs text-slate-600">{text}</Text></TouchableOpacity>)}
        <View className="mb-3 flex-row items-center rounded-xl border border-slate-200 bg-white p-2">
          <TextInput value={input} onChangeText={setInput} maxLength={1000} multiline editable={!busy}
            placeholder="Bạn muốn tìm dịch vụ hoặc lịch khám nào?" className="max-h-24 flex-1 p-2 text-sm text-slate-800" />
          <TouchableOpacity accessibilityLabel="Gửi tin nhắn" disabled={busy || !input.trim()} onPress={() => { void send() }} className="p-2"><Ionicons name="send" size={22} color="#047857" /></TouchableOpacity>
        </View>
        <Text className="mb-2 text-[10px] text-slate-500">Hỗ trợ tìm kiếm và đặt lịch. Không tư vấn triệu chứng hoặc chẩn đoán bệnh.</Text>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
