import { Text, View } from 'react-native'
import { ScreenShell } from '../common/ScreenShell'

export function TelehealthScreen({ appointmentId: _appointmentId }: { appointmentId: string }) {
  return <ScreenShell title="Tư vấn trực tuyến" showBackButton><View className="p-6"><Text>Vui lòng mở tính năng này trong ứng dụng Android/iOS hoặc dùng web bệnh nhân để gọi video.</Text></View></ScreenShell>
}
