import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingService } from '../services/bookingService'
import { appointmentService, CheckoutPayload } from '../services/appointmentService'
import { getTomorrowDateString } from '../utils/date'
import { useAuthStore } from '../store/useAuthStore'

export function useDoctorAvailability(doctorId?: string | number, date?: string, branchId?: string) {
  const tomorrow = getTomorrowDateString()
  return useQuery({
    queryKey: ['availability', doctorId, date, branchId],
    queryFn: () => bookingService.getBookingSlots({ doctorId: doctorId!, date: date!, branchId }),
    enabled: Boolean(doctorId && date && date >= tomorrow),
    staleTime: 1000 * 30, // 30 giây
    refetchInterval: 1000 * 60, // tự refetch mỗi 1 phút để cập nhật slot trống mới nhất
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CheckoutPayload) =>
      appointmentService.checkout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myAppointments'] })
      queryClient.invalidateQueries({ queryKey: ['availability'] })
    },
  })
}

export function useMyAppointments() {
  const { user, isAuthenticated } = useAuthStore()
  return useQuery({
    queryKey: ['myAppointments', user?.id],
    queryFn: () => appointmentService.getMyAppointments(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60,
  })
}
