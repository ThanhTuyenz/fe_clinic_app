import { api, unwrapNestResponse } from './api'

export interface AiProposal {
  id: string
  expiresAt: string
  bookingMethodCode: string
  slotId: string
  doctorId: string
  branchId: string
  specialtyId?: string
  servicePackageId?: string
  doctorName: string
  branchName: string
  packageName?: string
  date: string
  startTime: string
  endTime: string
  fee: number
}

export interface AiChatResponse {
  sessionId: string
  message: string
  step: 'GREETING' | 'COLLECTING_INFO' | 'PROPOSED' | 'ERROR'
  proposal?: AiProposal | null
  proposedPackages?: Array<{ id: string; name: string; price: number }>
  doctors?: Array<{ id: string; fullName: string; title?: string; avatarUrl?: string | null; specialtyName: string; branchName: string; consultationFee: number }>
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  data?: AiChatResponse
}

export const aiService = {
  async sendMessage(message: string, sessionId?: string): Promise<AiChatResponse> {
    const response = await api.post('/api/v1/ai/chat', { message, sessionId }, { timeout: 60000 })
    return unwrapNestResponse<AiChatResponse>(response.data)
  },
}
