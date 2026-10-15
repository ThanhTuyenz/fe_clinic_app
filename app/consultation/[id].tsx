import { useLocalSearchParams } from 'expo-router'
import { TelehealthScreen } from '../../src/components/telehealth/TelehealthScreen'

export default function ConsultationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return <TelehealthScreen appointmentId={id || ''} />
}
