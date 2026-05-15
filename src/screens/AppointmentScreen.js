import { useCallback, useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { createAppointment, getAvailability } from '../api/appointments.js'
import { listDoctors } from '../api/doctors.js'
import DoctorAvatar from '../components/DoctorAvatar.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import ScreenShell from '../components/ScreenShell.js'
import TextField from '../components/TextField.js'
import { getSession } from '../lib/session.js'
import { formatDateVi, getDoctorFullName } from '../lib/user.js'
import { colors } from '../theme/colors.js'

function toDateKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function buildNextDays(count = 14) {
  const rows = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    rows.push({ key: toDateKey(d), label: formatDateVi(d) })
  }
  return rows
}

export default function AppointmentScreen({ navigation }) {
  const days = useMemo(() => buildNextDays(), [])
  const [token, setToken] = useState('')
  const [doctors, setDoctors] = useState([])
  const [selectedDoctorId, setSelectedDoctorId] = useState('')
  const [selectedDate, setSelectedDate] = useState(days[0]?.key || '')
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)

  const loadScreen = useCallback(async () => {
    setError('')
    const session = await getSession()
    if (!session.token) {
      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để đặt lịch khám.' })
      return
    }
    setToken(session.token)
    try {
      const doctorRows = await listDoctors()
      setDoctors(doctorRows)
      if (!selectedDoctorId && doctorRows[0]?.id) {
        setSelectedDoctorId(doctorRows[0].id)
      }
    } catch (err) {
      setError(err.message || 'Không tải được danh sách bác sĩ.')
    }
  }, [navigation, selectedDoctorId])

  const loadSlots = useCallback(async () => {
    if (!token || !selectedDoctorId || !selectedDate) return
    setSlotsLoading(true)
    setError('')
    try {
      const data = await getAvailability({ token, doctorId: selectedDoctorId, date: selectedDate })
      const nextSlots = (data?.slots || data?.availableSlots || [])
        .map((slot) => (typeof slot === 'string' ? slot : slot?.startTime))
        .filter(Boolean)
      setSlots(nextSlots)
      setSelectedSlot('')
    } catch (err) {
      setSlots([])
      setError(err.message || 'Không lấy được khung giờ.')
    } finally {
      setSlotsLoading(false)
    }
  }, [selectedDate, selectedDoctorId, token])

  useFocusEffect(
    useCallback(() => {
      loadScreen()
    }, [loadScreen]),
  )

  useFocusEffect(
    useCallback(() => {
      loadSlots()
    }, [loadSlots]),
  )

  async function handleBook() {
    setError('')
    setInfo('')
    if (!selectedDoctorId || !selectedDate || !selectedSlot) {
      setError('Vui lòng chọn bác sĩ, ngày và khung giờ.')
      return
    }
    setLoading(true)
    try {
      const data = await createAppointment({
        token,
        doctorId: selectedDoctorId,
        appointmentDate: selectedDate,
        startTime: selectedSlot,
        note,
      })
      const appointment = data?.appointment || null
      const appointmentId = appointment?.id || appointment?._id || data?.id
      setInfo('Đặt lịch thành công.')
      if (appointmentId) {
        navigation.navigate('AppointmentDetail', { appointmentId, appointment })
      }
    } catch (err) {
      setError(err.message || 'Đặt lịch thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell title="Đặt lịch khám" subtitle="Chọn bác sĩ, ngày khám và khung giờ phù hợp.">
      <MessageBanner message={info} tone="info" />
      <MessageBanner message={error} />

      <Text style={styles.label}>Bác sĩ</Text>
      <FlatList
        horizontal
        data={doctors}
        keyExtractor={(item, index) => String(item.id || item._id || index)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => {
          const active = item.id === selectedDoctorId
          return (
            <Pressable
              onPress={() => setSelectedDoctorId(item.id)}
              style={[styles.chipDoctor, active && styles.chipActive]}
            >
              <DoctorAvatar doctor={item} size={36} />
              <Text style={[styles.chipDoctorName, active && styles.chipTextActive]} numberOfLines={2}>
                {getDoctorFullName(item)}
              </Text>
            </Pressable>
          )
        }}
      />

      <Text style={styles.label}>Ngày khám</Text>
      <FlatList
        horizontal
        data={days}
        keyExtractor={(item) => item.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        renderItem={({ item }) => {
          const active = item.key === selectedDate
          return (
            <Pressable onPress={() => setSelectedDate(item.key)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.label}</Text>
            </Pressable>
          )
        }}
      />

      <Text style={styles.label}>Khung giờ</Text>
      {slotsLoading ? <Text style={styles.muted}>Đang tải khung giờ…</Text> : null}
      <View style={styles.slotGrid}>
        {slots.map((slot) => {
          const active = slot === selectedSlot
          return (
            <Pressable key={slot} onPress={() => setSelectedSlot(slot)} style={[styles.slot, active && styles.slotActive]}>
              <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot}</Text>
            </Pressable>
          )
        })}
      </View>
      {!slotsLoading && !slots.length ? <Text style={styles.muted}>Không còn khung giờ trống.</Text> : null}

      <TextField label="Ghi chú" value={note} onChangeText={setNote} placeholder="Triệu chứng hoặc yêu cầu khám" multiline />
      <PrimaryButton title={loading ? 'Đang đặt lịch…' : 'Xác nhận đặt lịch'} onPress={handleBook} loading={loading} />
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 12,
  },
  chipDoctor: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 200,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 8,
    gap: 10,
  },
  chipDoctorName: {
    flex: 1,
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 18,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.infoBg,
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
  },
  chipText: {
    color: colors.text,
    fontWeight: '500',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  slot: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  slotActive: {
    borderColor: colors.primary,
    backgroundColor: colors.infoBg,
  },
  slotText: {
    color: colors.text,
    fontWeight: '500',
  },
  slotTextActive: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  muted: {
    color: colors.textMuted,
    marginBottom: 12,
  },
})
