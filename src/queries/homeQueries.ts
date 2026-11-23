import { doctorService } from '../services/doctorService'
import { clinicService } from '../services/clinicService'

// Shared keys let Home sections reuse the same in-flight request and cached response.
export const homeDoctorsQuery = {
  queryKey: ['doctors'] as const,
  queryFn: () => doctorService.getDoctors(),
  staleTime: 60_000,
}

export const clinicHomepageQuery = {
  queryKey: ['clinicHomepage'] as const,
  queryFn: () => clinicService.homepage(),
  staleTime: 5 * 60_000,
}
