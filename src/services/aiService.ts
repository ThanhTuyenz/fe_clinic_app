import { api, unwrapNestResponse } from './api'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export const aiService = {
  async sendMessage(messages: ChatMessage[], state: any = {}) {
    const res = await api.post('/api/v1/ai/chat', {
      messages: messages.filter((m) => m.content.trim()),
      state,
    })
    const data = unwrapNestResponse<any>(res.data)
    return (data || res.data) as { reply: string; state?: any }
  },
}
