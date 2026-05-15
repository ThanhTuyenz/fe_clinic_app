import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getAppointment } from '../api/appointments.js'
import MessageBanner from '../components/MessageBanner.js'
import ScreenShell from '../components/ScreenShell.js'
import { getSession } from '../lib/session.js'
import { formatDateVi, getDoctorFullName } from '../lib/user.js'
import { colors } from '../theme/colors.js'

export default function AppointmentDetailScreen({ navigation, route }) {
  const appointmentId = route.params?.appointmentId
  const initialAppointment = route.params?.appointment || null
  const [row, setRow] = useState(initialAppointment)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadDetail = useCallback(async () => {
    if (initialAppointment) {
      setRow(initialAppointment)
      return
    }
    if (!appointmentId) {
      setError('Không tìm thấy mã lịch khám.')
      return
    }
    setError('')
    const session = await getSession()
    if (!session.token) {
      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để xem chi tiết lịch khám.' })
      return
    }
    setLoading(true)
    try {
      const data = await getAppointment({ token: session.token, appointmentId })
      setRow(data)
    } catch (err) {
      setError(err.message || 'Không lấy được chi tiết lịch khám.')
    } finally {
      setLoading(false)
    }
  }, [appointmentId, initialAppointment, navigation])

  useFocusEffect(
    useCallback(() => {
      loadDetail()
    }, [loadDetail]),
  )

  return (
    <ScreenShell title="Chi tiết lịch khám" subtitle="Thông tin lịch hẹn và bác sĩ phụ trách.">
      <MessageBanner message={error} />
      {loading ? <Text style={styles.muted}>Đang tải…</Text> : null}
      {row ? (
        <View style={styles.card}>
          <Text style={styles.label}>Bác sĩ</Text>
          <Text style={styles.value}>{getDoctorFullName(row.doctor) || row.doctorName || '—'}</Text>
          <Text style={styles.label}>Ngày khám</Text>
          <Text style={styles.value}>{formatDateVi(row.appointmentDate)}</Text>
          <Text style={styles.label}>Giờ khám</Text>
          <Text style={styles.value}>{String(row.startTime || '').slice(0, 5)}</Text>
          <Text style={styles.label}>Trạng thái</Text>
          <Text style={styles.value}>{row.status || '—'}</Text>
          {row.note ? (
            <>
              <Text style={styles.label}>Ghi chú</Text>
              <Text style={styles.value}>{row.note}</Text>
            </>
          ) : null}
        </View>
      ) : null}
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  muted: {
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  label: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
})
