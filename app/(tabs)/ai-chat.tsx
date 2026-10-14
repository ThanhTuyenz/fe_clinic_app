import { useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { aiService, ChatMessage } from '../../src/services/aiService'
import { ScreenShell } from '../../src/components/common/ScreenShell'

const SUGGESTED_PROMPTS = [
  'Tôi bị sốt và ho dai dẳng 3 ngày nay',
  'Triệu chứng đau nửa đầu cần khám chuyên khoa gì?',
  'Chi phí khám tổng quát tại phòng khám',
  'Quy trình đặt lịch khám cho người thân',
]

export default function AiChatScreen() {
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Xin chào! Tôi là Trợ lý AI của VitaCare Clinic. Tôi có thể tư vấn sơ bộ về triệu chứng, gợi ý chuyên khoa phù hợp và hỗ trợ bạn đặt lịch khám nhanh chóng. Bạn đang gặp phải vấn đề sức khỏe gì?',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (textToSend?: string) => {
    const content = (textToSend || input).trim()
    if (!content || loading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await aiService.sendMessage(newMessages)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply || 'Cảm ơn bạn đã chia sẻ.' },
      ])
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Xin lỗi, hiện tại hệ thống AI đang bận hoặc gián đoạn kết nối. Bạn có thể nhấn trực tiếp vào nút Đặt lịch khám bên dưới để chọn bác sĩ nhé!',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user'

    return (
      <View
        className={`mb-3.5 max-w-[85%] ${
          isUser ? 'self-end' : 'self-start'
        }`}
      >
        <View
          className={`p-3.5 rounded-lg ${
            isUser
              ? 'bg-primary-600 rounded-tr-none'
              : 'bg-white border border-slate-100 rounded-tl-none shadow-xs'
          }`}
        >
          {!isUser && (
            <View className="flex-row items-center mb-1">
              <Ionicons name="sparkles" size={13} color="#28a745" />
              <Text className="text-[11px] font-bold text-primary-700 ml-1">
                Trợ lý VitaCare
              </Text>
            </View>
          )}
          <Text
            className={`text-sm leading-relaxed ${
              isUser ? 'text-white' : 'text-slate-800'
            }`}
          >
            {item.content}
          </Text>
        </View>

        {!isUser && (
          <TouchableOpacity
            onPress={() => router.push('/booking')}
            className="self-start mt-1.5 flex-row items-center bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-200"
          >
            <Ionicons name="calendar-outline" size={14} color="#28a745" />
            <Text className="text-xs font-bold text-primary-700 ml-1">
              Đặt lịch theo gợi ý này
            </Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  return (
    <ScreenShell title="Trợ lý AI y tế">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-4 pt-3">
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, index) => String(index)}
            renderItem={renderMessageItem}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />

          {loading && (
            <View className="flex-row items-center p-3 mb-2 bg-white rounded-lg border border-slate-100 self-start shadow-xs">
              <ActivityIndicator size="small" color="#28a745" />
              <Text className="text-xs text-slate-500 font-medium ml-2">
                Trợ lý AI đang phân tích triệu chứng...
              </Text>
            </View>
          )}

          {/* Gợi ý câu hỏi nhanh */}
          {messages.length <= 2 && (
            <View className="py-2">
              <Text className="text-xs font-semibold text-slate-400 mb-2">
                Gợi ý câu hỏi nhanh:
              </Text>
              <View className="flex-row flex-wrap">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleSend(prompt)}
                    className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg mr-1.5 mb-2 active:bg-slate-100"
                  >
                    <Text className="text-xs text-slate-700">{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Input Chat Box */}
          <View className="flex-row items-center bg-white rounded-lg border border-slate-200 px-3 py-2 mb-3 shadow-xs">
            <TextInput
              placeholder="Nhập triệu chứng hoặc câu hỏi của bạn..."
              placeholderTextColor="#94a3b8"
              value={input}
              onChangeText={setInput}
              className="flex-1 text-slate-800 text-sm py-1.5 max-h-24 outline-none"
              style={{ outlineStyle: 'none' as any }}
              multiline
            />
            <TouchableOpacity
              onPress={() => handleSend()}
              disabled={!input.trim() || loading}
              className={`w-9 h-9 rounded-lg items-center justify-center ml-2 ${
                input.trim() && !loading ? 'bg-primary-600' : 'bg-slate-100'
              }`}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={input.trim() && !loading ? '#ffffff' : '#94a3b8'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
