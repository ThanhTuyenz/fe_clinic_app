import { api } from './api'

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
    return res.data as { reply: string; state?: any }
  },
}
