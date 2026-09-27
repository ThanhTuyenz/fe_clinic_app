import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorService } from '../services/doctorService'
import { appointmentService, CreateAppointmentPayload } from '../services/appointmentService'

export function useDoctorAvailability(doctorId?: string | number, date?: string) {
  return useQuery({
    queryKey: ['availability', doctorId, date],
    queryFn: () => doctorService.getAvailability(doctorId!, date!),
    enabled: Boolean(doctorId && date),
    staleTime: 1000 * 30, // 30 giây
    refetchInterval: 1000 * 60, // tự refetch mỗi 1 phút để cập nhật slot trống mới nhất
  })
}

export function useCreateAppointment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAppointmentPayload) =>
      appointmentService.createAppointment(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myAppointments'] })
      queryClient.invalidateQueries({
        queryKey: ['availability', variables.doctorId, variables.appointmentDate],
      })
    },
  })
}

export function useMyAppointments() {
  return useQuery({
    queryKey: ['myAppointments'],
    queryFn: () => appointmentService.getMyAppointments(),
    staleTime: 1000 * 60,
  })
}
