import { api, unwrapNestResponse } from './api'

export type NotificationType =
  | 'APPOINTMENT_REMINDER'
  | 'BOOKING_CONFIRMED'
  | 'STATUS_CHANGED'
  | 'MEDICAL_RESULT'
  | 'CONTACT_REPLY'
  | 'SYSTEM'

export interface AppNotification {
  id: string
  userId: string
  title: string
  content: string
  type: NotificationType
  data?: {
    appointmentId?: string
    bookingCode?: string
    hoursAhead?: number
    startTime?: string
    appointmentDate?: string
    branchName?: string
    doctorName?: string
    serviceName?: string
    recordId?: string
    [key: string]: any
  } | null
  isRead: boolean
  createdAt: string
}

export interface GetNotificationsResponse {
  items: AppNotification[]
  total: number
  page: number
  limit: number
  totalPages: number
  unreadCount: number
}

export const notificationService = {
  async getNotifications(params?: {
    page?: number
    limit?: number
    type?: NotificationType
    isRead?: boolean
  }): Promise<GetNotificationsResponse> {
    try {
      const res = await api.get('/api/v1/notifications', { params })
      return (
        unwrapNestResponse<GetNotificationsResponse>(res.data) || {
          items: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          unreadCount: 0,
        }
      )
    } catch {
      return {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        unreadCount: 0,
      }
    }
  },

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    try {
      const res = await api.get('/api/v1/notifications/unread-count')
      return unwrapNestResponse<{ unreadCount: number }>(res.data) || { unreadCount: 0 }
    } catch {
      return { unreadCount: 0 }
    }
  },

  async markAsRead(id: string): Promise<AppNotification | null> {
    try {
      const res = await api.patch(`/api/v1/notifications/${id}/read`)
      return unwrapNestResponse<AppNotification>(res.data)
    } catch {
      return null
    }
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    try {
      const res = await api.patch('/api/v1/notifications/read-all')
      return unwrapNestResponse<{ success: boolean }>(res.data) || { success: true }
    } catch {
      return { success: false }
    }
  },

  async saveDeviceToken(token: string, deviceType: string = 'mobile'): Promise<any> {
    try {
      const res = await api.post('/api/v1/notifications/device-token', { token, deviceType })
      return unwrapNestResponse(res.data)
    } catch {
      return null
    }
  },

  async removeDeviceToken(token: string): Promise<any> {
    try {
      const res = await api.delete('/api/v1/notifications/device-token', { data: { token } })
      return unwrapNestResponse(res.data)
    } catch {
      return null
    }
  },
}
