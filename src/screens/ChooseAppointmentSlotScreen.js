import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { createAppointment, getAvailability, getDoctorScheduleDates } from '../api/appointments.js'
import { listDoctors } from '../api/doctors.js'
import { listSpecialties } from '../api/specialties.js'
import DoctorAvatar from '../components/DoctorAvatar.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import TextField from '../components/TextField.js'
import { weekdayViLong, toDateKey } from '../lib/bookingCalendar.js'
import {
  buildSpecialtyIdLookup,
  deriveDoctorTitle,
  doctorSpecialtyLine,
  formatDoctorPriceVi,
} from '../lib/doctorProfileUi.js'
import {
  DUPLICATE_PENDING_DOCTOR_MESSAGE,
  SLOT_OVERLAP_APPOINTMENT_MESSAGE,
  fetchBlockingForNewSlot,
  fetchBlockingPendingForDoctor,
} from '../lib/bookingConstraints.js'
import { getSession } from '../lib/session.js'
import { formatDateVi } from '../lib/user.js'
import { colors } from '../theme/colors.js'

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  android: { elevation: 2 },
  default: {},
})

function addDays(base, n) {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  d.setHours(0, 0, 0, 0)
  return d
}

function stripDateLabel(isoKey) {
  const d = new Date(`${isoKey}T12:00:00`)
  if (Number.isNaN(d.getTime())) return isoKey
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm} ${d.getFullYear()}`
}

export default function ChooseAppointmentSlotScreen({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const doctorId = String(
    route.params?.doctorId || route.params?.doctor?.id || route.params?.doctor?._id || '',
  ).trim()
  const appointmentDateParam = String(route.params?.appointmentDate || '').slice(0, 10)
  const doctorFromParams = route.params?.doctor

  const [token, setToken] = useState('')
  const [doctor, setDoctor] = useState(doctorFromParams || null)
  const [scheduleDates, setScheduleDates] = useState([])
  const [datesLoading, setDatesLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(
    /^\d{4}-\d{2}-\d{2}$/.test(appointmentDateParam) ? appointmentDateParam : '',
  )
  const [slots, setSlots] = useState([])
  const [slotShifts, setSlotShifts] = useState([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [specialties, setSpecialties] = useState([])

  useEffect(() => {
    if (doctorFromParams) setDoctor(doctorFromParams)
  }, [doctorFromParams])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      listSpecialties()
        .then((rows) => {
          if (!cancelled) setSpecialties(Array.isArray(rows) ? rows : [])
        })
        .catch(() => {
          if (!cancelled) setSpecialties([])
        })
      return () => {
        cancelled = true
      }
    }, []),
  )

  const specLookup = useMemo(() => buildSpecialtyIdLookup(specialties), [specialties])
  const docSpecDisplay = useMemo(
    () => (doctor ? doctorSpecialtyLine(doctor, specLookup) : '—'),
    [doctor, specLookup],
  )

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      ;(async () => {
        const session = await getSession()
        if (!session.token) {
          navigation.replace('Login', { message: 'Vui lòng đăng nhập để đặt lịch khám.' })
          return
        }
        if (cancelled) return
        setToken(session.token)
      })()
      return () => {
        cancelled = true
      }
    }, [navigation]),
  )

  useFocusEffect(
    useCallback(() => {
      if (!token || !doctorId) return undefined
      let cancelled = false
      ;(async () => {
        try {
          const hit = await fetchBlockingPendingForDoctor(token, doctorId)
          if (cancelled || !hit) return
          Alert.alert('Thông báo', DUPLICATE_PENDING_DOCTOR_MESSAGE, [
            { text: 'Đóng', onPress: () => navigation.goBack() },
          ])
        } catch {
          /* ignore */
        }
      })()
      return () => {
        cancelled = true
      }
    }, [doctorId, navigation, token]),
  )

  useEffect(() => {
    if (!doctorId || doctor || doctorFromParams) return
    let cancelled = false
    listDoctors()
      .then((rows) => {
        if (cancelled) return
        const d = rows.find((x) => String(x.id) === doctorId)
        if (d) setDoctor(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [doctor, doctorFromParams, doctorId])

  const range = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const end = addDays(start, 56)
    return { from: toDateKey(start), to: toDateKey(end) }
  }, [])

  const loadScheduleDates = useCallback(async () => {
    if (!token || !doctorId) return
    setDatesLoading(true)
    try {
      const dates = await getDoctorScheduleDates({ token, doctorId, from: range.from, to: range.to })
      const list = Array.isArray(dates) ? [...dates].sort() : []
      setScheduleDates(list)
      setSelectedDate((prev) => {
        if (!list.length) return prev
        if (prev && list.includes(prev)) return prev
        const pref = list.includes(appointmentDateParam) ? appointmentDateParam : list[0]
        return pref
      })
    } catch {
      setScheduleDates([])
    } finally {
      setDatesLoading(false)
    }
  }, [appointmentDateParam, doctorId, range.from, range.to, token])

  useEffect(() => {
    loadScheduleDates()
  }, [loadScheduleDates])

  const loadSlots = useCallback(async () => {
    if (!token || !doctorId || !selectedDate) return
    setSlotsLoading(true)
    setError('')
    try {
      const data = await getAvailability({ token, doctorId, date: selectedDate })
      setSlots(data.slots || [])
      setSlotShifts(Array.isArray(data.shifts) ? data.shifts : [])
      setSelectedSlot('')
    } catch (err) {
      setSlots([])
      setSlotShifts([])
      setError(err.message || 'Không lấy được khung giờ.')
    } finally {
      setSlotsLoading(false)
    }
  }, [doctorId, selectedDate, token])

  useEffect(() => {
    loadSlots()
  }, [loadSlots])

  const primaryShiftLine = useMemo(() => {
    if (!slotShifts.length) return ''
    const s = slotShifts[0]
    const name = String(s?.name || '').trim() || 'Ca khám'
    const d = new Date(`${selectedDate}T12:00:00`)
    if (Number.isNaN(d.getTime())) return name
    return `${formatDateVi(d)} — ${name} (${weekdayViLong(d)})`
  }, [selectedDate, slotShifts])

  async function handleBook() {
    setError('')
    setInfo('')
    if (!doctorId || !selectedDate || !selectedSlot) {
      setError('Vui lòng chọn khung giờ.')
      return
    }
    try {
      const block = await fetchBlockingForNewSlot(token, {
        doctorId,
        appointmentDate: selectedDate,
        startTime: selectedSlot,
      })
      if (block?.kind === 'doctor') {
        Alert.alert('Thông báo', DUPLICATE_PENDING_DOCTOR_MESSAGE)
        return
      }
      if (block?.kind === 'overlap') {
        Alert.alert('Thông báo', SLOT_OVERLAP_APPOINTMENT_MESSAGE)
        return
      }
    } catch {
      /* tiếp tục nếu không kiểm tra được */
    }
    setLoading(true)
    try {
      const data = await createAppointment({
        token,
        doctorId,
        appointmentDate: selectedDate,
        startTime: selectedSlot,
        note,
      })
      const appointment = data?.appointment || null
      const appointmentId = appointment?.id || appointment?._id || data?.id
      if (appointmentId) {
        navigation.navigate('AppointmentDetail', {
          appointmentId,
          appointment,
          bookingSuccess: true,
          successMessage: data?.message || 'Đăng ký lịch khám thành công!',
        })
      } else {
        setInfo(data?.message || 'Đăng ký lịch khám thành công.')
      }
    } catch (err) {
      const msg = err?.data?.message || err.message || 'Đặt lịch thất bại.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!doctorId) {
    return (
      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <Text style={styles.muted}>Thiếu thông tin bác sĩ.</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={styles.link}>Quay lại</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={26} color={colors.brandBlue} />
        </Pressable>
        <Text style={styles.headerTitle}>Chọn khung giờ khám</Text>
        <Pressable onPress={() => navigation.navigate('MainTabs')} hitSlop={12} style={styles.headerIcon}>
          <Ionicons name="home-outline" size={24} color={colors.brandBlue} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.accentRow}>
            <View style={styles.accentBar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.accentTitle}>CHỌN KHUNG GIỜ KHÁM</Text>
              <Text style={styles.accentSub}>Vui lòng bấm chọn khung giờ màu xanh dương để đặt khám.</Text>
            </View>
          </View>

          {doctor ? (
            <>
              <View style={styles.docRow}>
                <DoctorAvatar doctor={doctor} size={56} style={styles.docAvatar} />
                <View style={styles.docMeta}>
                  <Text style={styles.docName} numberOfLines={2}>
                    {deriveDoctorTitle(doctor)}
                  </Text>
                  <Text style={styles.docSpec} numberOfLines={2}>
                    {docSpecDisplay}
                  </Text>
                  {formatDoctorPriceVi(doctor) ? (
                    <Text style={styles.docPrice}>{formatDoctorPriceVi(doctor)}</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
              </View>
              <Pressable onPress={() => navigation.navigate('DoctorInfo', { doctor })} style={styles.infoBtn}>
                <Text style={styles.infoBtnText}>Thông tin bác sĩ &gt;</Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.muted}>Đang tải thông tin bác sĩ…</Text>
          )}

          <View style={styles.dash} />

          {datesLoading ? (
            <ActivityIndicator color={colors.brandBlue} style={{ marginVertical: 12 }} />
          ) : (
            <FlatList
              horizontal
              data={scheduleDates}
              keyExtractor={(k) => k}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateStrip}
              renderItem={({ item }) => {
                const active = item === selectedDate
                return (
                  <Pressable
                    onPress={() => setSelectedDate(item)}
                    style={({ pressed }) => [
                      styles.stripChip,
                      active && styles.stripChipActive,
                      pressed && styles.stripChipPressed,
                    ]}
                  >
                    {active ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#fff"
                        style={styles.stripCheck}
                      />
                    ) : null}
                    <Text style={[styles.stripChipText, active && styles.stripChipTextActive]}>
                      {stripDateLabel(item)}
                    </Text>
                  </Pressable>
                )
              }}
            />
          )}

          {primaryShiftLine ? <Text style={styles.shiftHead}>{primaryShiftLine}</Text> : null}

          <MessageBanner message={info} tone="info" />
          <MessageBanner message={error} />

          {slotsLoading ? (
            <View style={styles.slotsLoading}>
              <ActivityIndicator color={colors.brandBlue} size="small" />
              <Text style={styles.slotsLoadingText}>Đang tải lịch trống…</Text>
            </View>
          ) : slotShifts.length ? (
            <View style={styles.shiftBlocks}>
              {slotShifts.map((shift) => (
                <View key={shift.shiftID || shift.name} style={styles.shiftBlock}>
                  <Text style={styles.shiftLabel}>
                    {shift.name}
                    {shift.startTime && shift.endTime ? ` · ${shift.startTime}–${shift.endTime}` : ''}
                  </Text>
                  <View style={styles.slotGrid}>
                    {(shift.slots || []).map((slot) => {
                      const active = slot === selectedSlot
                      return (
                        <Pressable
                          key={`${shift.shiftID}-${slot}`}
                          onPress={() => setSelectedSlot(slot)}
                          style={({ pressed }) => [
                            styles.slotCell,
                            active && styles.slotCellActive,
                            pressed && styles.slotCellPressed,
                          ]}
                        >
                          <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot}</Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              ))}
            </View>
          ) : slots.length ? (
            <View style={styles.slotGrid}>
              {slots.map((slot) => {
                const active = slot === selectedSlot
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setSelectedSlot(slot)}
                    style={({ pressed }) => [
                      styles.slotCell,
                      active && styles.slotCellActive,
                      pressed && styles.slotCellPressed,
                    ]}
                  >
                    <Text style={[styles.slotText, active && styles.slotTextActive]}>{slot}</Text>
                  </Pressable>
                )
              })}
            </View>
          ) : (
            <View style={styles.slotsEmpty}>
              <Text style={styles.slotsEmptyTitle}>Không còn khung giờ</Text>
              <Text style={styles.slotsEmptySub}>Thử chọn ngày khác trong danh sách phía trên.</Text>
            </View>
          )}

          <Text style={styles.noteLabel}>Ghi chú · tùy chọn</Text>
          <TextField
            label=""
            value={note}
            onChangeText={setNote}
            placeholder="Triệu chứng hoặc yêu cầu khám"
            multiline
          />

          <PrimaryButton
            title={loading ? 'Đang đăng ký…' : 'Xác nhận đăng ký lịch khám'}
            onPress={handleBook}
            loading={loading}
            variant="brand"
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#eef6fc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.brandBlue,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    ...cardShadow,
    gap: 12,
  },
  accentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  accentBar: {
    width: 4,
    borderRadius: 4,
    backgroundColor: colors.brandBlue,
    marginTop: 4,
    minHeight: 40,
  },
  accentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brandBlue,
    letterSpacing: 0.5,
  },
  accentSub: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docAvatar: { borderRadius: 12 },
  docMeta: { flex: 1, minWidth: 0 },
  docName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brandBlue,
  },
  docSpec: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
  },
  docPrice: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  infoBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.brandBlue,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  infoBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandBlue,
  },
  dash: {
    marginVertical: 4,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cfd8e3',
  },
  dateStrip: {
    gap: 10,
    paddingVertical: 4,
  },
  stripChip: {
    position: 'relative',
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.pageCanvas,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
  },
  stripChipActive: {
    backgroundColor: colors.brandBlue,
    borderColor: colors.brandBlue,
  },
  stripChipPressed: { opacity: 0.9 },
  stripCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  stripChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  stripChipTextActive: { color: '#fff' },
  shiftHead: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginTop: 4,
  },
  slotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  slotsLoadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  shiftBlocks: { gap: 14 },
  shiftBlock: { gap: 8 },
  shiftLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandBlueDark,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  slotCell: {
    width: '47%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.brandBlueSoft,
    alignItems: 'center',
  },
  slotCellActive: {
    borderColor: colors.brandBlue,
    backgroundColor: colors.brandBlueSoft,
  },
  slotCellPressed: { opacity: 0.9 },
  slotText: {
    color: colors.brandBlueDark,
    fontWeight: '700',
    fontSize: 15,
  },
  slotTextActive: { color: colors.brandBlueDark },
  slotsEmpty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  slotsEmptyTitle: {
    fontWeight: '700',
    color: colors.text,
  },
  slotsEmptySub: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  noteLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
  },
  muted: { color: colors.textMuted, fontSize: 14 },
  link: { color: colors.brandBlue, fontWeight: '700' },
})
