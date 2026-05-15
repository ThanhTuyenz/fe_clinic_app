import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { cancelAppointment, listMyAppointments } from '../api/appointments.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import ScreenShell from '../components/ScreenShell.js'
import { getSession } from '../lib/session.js'
import { formatDateVi, getDoctorFullName } from '../lib/user.js'
import { isPendingAppointmentPastSlot } from '../utils/appointmentExpiry.js'
import { colors } from '../theme/colors.js'

function statusLabel(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'pending') return 'Chờ khám'
  if (s === 'confirmed') return 'Đã xác nhận'
  if (s === 'completed') return 'Hoàn tất'
  if (s === 'cancelled' || s === 'canceled') return 'Đã hủy'
  return status || 'Không rõ'
}

export default function MyAppointmentsScreen({ navigation }) {
  const [token, setToken] = useState('')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [cancellingId, setCancellingId] = useState('')

  const loadRows = useCallback(async () => {
    setError('')
    const session = await getSession()
    if (!session.token) {
      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để xem lịch khám.' })
      return
    }
    setToken(session.token)
    setLoading(true)
    try {
      const data = await listMyAppointments({ token: session.token })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Không lấy được lịch khám.')
    } finally {
      setLoading(false)
    }
  }, [navigation])

  useFocusEffect(
    useCallback(() => {
      loadRows()
    }, [loadRows]),
  )

  async function handleCancel(appointmentId) {
    if (!token || !appointmentId) return
    setCancellingId(appointmentId)
    setError('')
    try {
      await cancelAppointment({ token, appointmentId, cancelReason: 'Bệnh nhân hủy trên ứng dụng' })
      await loadRows()
    } catch (err) {
      setError(err.message || 'Không hủy được lịch khám.')
    } finally {
      setCancellingId('')
    }
  }

  return (
    <ScreenShell title="Lịch sử đặt khám" subtitle="Theo dõi và quản lý các lịch hẹn đã đặt.">
      <MessageBanner message={error} />
      {loading ? <Text style={styles.muted}>Đang tải lịch khám…</Text> : null}
      {!loading && !rows.length ? <Text style={styles.muted}>Bạn chưa có lịch khám nào.</Text> : null}

      {rows.map((row) => {
        const id = row.id || row._id
        const expired = isPendingAppointmentPastSlot(row)
        const canCancel = String(row.status || '').toLowerCase() === 'pending' && !expired
        return (
          <View key={id} style={styles.card}>
            <Text style={styles.cardTitle}>{getDoctorFullName(row.doctor) || row.doctorName || 'Bác sĩ'}</Text>
            <Text style={styles.cardMeta}>
              {formatDateVi(row.appointmentDate)} · {String(row.startTime || '').slice(0, 5)}
            </Text>
            <Text style={styles.status}>{statusLabel(row.status)}</Text>
            {row.note ? <Text style={styles.note}>{row.note}</Text> : null}
            <View style={styles.actions}>
              <PrimaryButton
                title="Chi tiết"
                variant="secondary"
                onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: id, appointment: row })}
              />
              {canCancel ? (
                <Pressable onPress={() => handleCancel(id)} disabled={cancellingId === id}>
                  <Text style={styles.cancel}>{cancellingId === id ? 'Đang hủy…' : 'Hủy lịch'}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )
      })}
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  muted: {
    color: colors.textMuted,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardMeta: {
    marginTop: 4,
    color: colors.textMuted,
  },
  status: {
    marginTop: 8,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  note: {
    marginTop: 8,
    color: colors.text,
    lineHeight: 20,
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  cancel: {
    color: colors.danger,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
})
