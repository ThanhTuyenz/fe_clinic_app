import { api, unwrapNestResponse } from './api'

export interface TelehealthRoom {
  appointmentId: string
  bookingCode: string
  status: string
  appointmentDate?: string
  startTime?: string
  endTime?: string
  doctor: { id: string; name: string; specialtyName: string } | null
  patient: { id: string; name: string }
  serviceName: string
}

export const telehealthService = {
  async getRoom(id: string) {
    const response = await api.get(`/api/v1/telehealth/room/${encodeURIComponent(id)}`)
    // The controller envelope can be wrapped again by the global interceptor.
    const room = unwrapNestResponse<TelehealthRoom>(unwrapNestResponse<unknown>(response.data))
    if (!room || room.appointmentId !== id || typeof room.status !== 'string') {
      throw new Error('Không đọc được thông tin phòng tư vấn. Vui lòng thử tải lại.')
    }
    return room
  },
}

export const canJoinTelehealth = (appointment: { status: string; isTelehealth?: boolean; bookingMethod?: { code: string } | null }) =>
  (appointment.isTelehealth || appointment.bookingMethod?.code === 'ONLINE_CONSULTATION') &&
  ['CONFIRMED', 'CHECKED_IN'].includes(appointment.status.toUpperCase())
