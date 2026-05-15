import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createAppointment, getAvailability, listMyAppointments } from '../api/appointments.js'
import { listDoctors } from '../api/doctors.js'
import DoctorAvatar from '../components/DoctorAvatar.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import TextField from '../components/TextField.js'
import {
  getAppointmentSpecialtyLine,
  getAppointmentServiceLine,
  getClinicTitle,
  getTicketDisplay,
  resolveAppointmentPatientLine,
} from '../lib/appointmentCard.js'
import { getAppointmentStatusKind, getAppointmentStatusLabel } from '../lib/appointmentStatus.js'
import { getSession } from '../lib/session.js'
import { formatDateVi, getDoctorFullName } from '../lib/user.js'
import { colors } from '../theme/colors.js'

const WEEKDAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

const STATUS_FILTER_TABS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'confirmed', label: 'Đã xác nhận' },
  { id: 'done', label: 'Đã khám' },
  { id: 'cancelled', label: 'Đã hủy' },
]

function toDateKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function buildNextDays(count = 14) {
  const rows = []
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  const todayKey = toDateKey(base)
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    const key = toDateKey(d)
    rows.push({
      key,
      weekday: WEEKDAY_VI[d.getDay()],
      dayNum: d.getDate(),
      monthNum: d.getMonth() + 1,
      isToday: key === todayKey,
      labelFull: formatDateVi(d),
    })
  }
  return rows
}

function compareAppointmentsDesc(a, b) {
  const da = String(a?.appointmentDate || a?.date || '')
  const db = String(b?.appointmentDate || b?.date || '')
  const byDate = db.localeCompare(da)
  if (byDate !== 0) return byDate
  return String(b?.startTime || '').localeCompare(String(a?.startTime || ''))
}

function getAppointmentRowId(a) {
  return String(a?.id || a?._id || '')
}

function statusValueColor(kind) {
  if (kind === 'pending' || kind === 'cancelled') return colors.danger
  if (kind === 'confirmed') return colors.brandBlue
  return colors.textMuted
}

function SectionCard({ title, hint, children }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  )
}

function TicketCard({ appointment, sessionUser, onOpenDetail }) {
  const id = getAppointmentRowId(appointment)
  const ticket = getTicketDisplay(appointment)
  const { name: patientName } = resolveAppointmentPatientLine(appointment, sessionUser)
  const service = getAppointmentServiceLine(appointment)
  const specialty = getAppointmentSpecialtyLine(appointment)
  const dateRaw = appointment?.appointmentDate || appointment?.date
  const dateLabel = dateRaw ? formatDateVi(dateRaw) : '—'
  const timeLabel = String(appointment?.startTime || '').trim() || '—'
  const statusKind = getAppointmentStatusKind(appointment?.status)
  const statusLabel = getAppointmentStatusLabel(appointment?.status)
  const statusColor = statusValueColor(statusKind)

  return (
    <Pressable
      onPress={() => id && onOpenDetail(id, appointment)}
      style={({ pressed }) => [styles.ticketCard, pressed && styles.ticketCardPressed]}
    >
      <View style={styles.ticketTop}>
        <Text style={styles.ticketCodeLine}>
          <Text style={styles.ticketCodeMuted}>Mã phiếu: </Text>
          <Text style={styles.ticketCodeBold}>{ticket}</Text>
        </Text>
        <Text style={styles.detailLink}>Xem chi tiết ›</Text>
      </View>
      <Text style={styles.patientNameCaps} numberOfLines={2}>
        {patientName.toUpperCase()}
      </Text>
      <View style={styles.dashLine} />
      <Text style={styles.clinicNameCaps}>{getClinicTitle()}</Text>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Dịch vụ</Text>
        <Text style={styles.kvValue}>{service}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Chuyên khoa</Text>
        <Text style={styles.kvValue}>{specialty}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Ngày giờ</Text>
        <Text style={styles.kvValue}>
          {dateLabel} · {timeLabel}
        </Text>
      </View>
      <View style={[styles.kvRow, styles.kvRowLast]}>
        <Text style={styles.kvLabel}>Trạng thái</Text>
        <Text style={[styles.kvStatusValue, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </Pressable>
  )
}

export default function AppointmentScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const days = useMemo(() => buildNextDays(), [])
  const [token, setToken] = useState('')
  const [sessionUser, setSessionUser] = useState(null)
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
  const [myAppointments, setMyAppointments] = useState([])
  const [myListLoading, setMyListLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')

  const loadScreen = useCallback(async () => {
    setError('')
    const session = await getSession()
    if (!session.token) {
      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để đặt lịch khám.' })
      return
    }
    setToken(session.token)
    setSessionUser(session.user || null)
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

  const loadMyAppointments = useCallback(async () => {
    if (!token) {
      setMyAppointments([])
      setMyListLoading(false)
      return
    }
    setMyListLoading(true)
    try {
      const rows = await listMyAppointments({ token })
      const sorted = Array.isArray(rows) ? [...rows].sort(compareAppointmentsDesc) : []
      setMyAppointments(sorted.slice(0, 80))
    } catch {
      setMyAppointments([])
    } finally {
      setMyListLoading(false)
    }
  }, [token])

  const filteredAppointments = useMemo(() => {
    if (statusFilter === 'all') return myAppointments
    return myAppointments.filter((a) => getAppointmentStatusKind(a?.status) === statusFilter)
  }, [myAppointments, statusFilter])

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

  useFocusEffect(
    useCallback(() => {
      loadMyAppointments()
    }, [loadMyAppointments]),
  )

  const openDetail = useCallback(
    (appointmentId, appointment) => {
      navigation.navigate('AppointmentDetail', { appointmentId, appointment })
    },
    [navigation],
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
      loadMyAppointments()
      if (appointmentId) {
        navigation.navigate('AppointmentDetail', { appointmentId, appointment })
      }
    } catch (err) {
      setError(err.message || 'Đặt lịch thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId)

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandBlue} />
      <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
        <View style={styles.heroTop}>
          {navigation.canGoBack() ? (
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
          <Text style={styles.heroTitle} numberOfLines={2}>
            Danh sách phiếu khám bệnh
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {STATUS_FILTER_TABS.map((tab) => {
            const active = statusFilter === tab.id
            return (
              <Pressable
                key={tab.id}
                onPress={() => setStatusFilter(tab.id)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active ? styles.filterChipActive : styles.filterChipIdle,
                  pressed && styles.filterChipPressed,
                ]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{tab.label}</Text>
              </Pressable>
            )
          })}
        </ScrollView>
        {!myListLoading ? (
          <Text style={styles.filterHint} numberOfLines={1}>
            {filteredAppointments.length} phiếu
            {statusFilter !== 'all' ? ` · ${STATUS_FILTER_TABS.find((t) => t.id === statusFilter)?.label || ''}` : ''}
          </Text>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <MessageBanner message={info} tone="info" />
        <MessageBanner message={error} />

        <View style={styles.listSection}>
          {myListLoading ? (
            <View style={styles.listLoading}>
              <ActivityIndicator color={colors.brandBlue} size="small" />
              <Text style={styles.listLoadingText}>Đang tải danh sách…</Text>
            </View>
          ) : filteredAppointments.length ? (
            filteredAppointments.map((a, index) => (
              <TicketCard
                key={getAppointmentRowId(a) || `appt-${index}`}
                appointment={a}
                sessionUser={sessionUser}
                onOpenDetail={openDetail}
              />
            ))
          ) : (
            <View style={styles.listEmpty}>
              <Text style={styles.listEmptyTitle}>Không có phiếu phù hợp</Text>
              <Text style={styles.listEmptySub}>Đổi bộ lọc trạng thái hoặc đặt lịch mới bên dưới.</Text>
            </View>
          )}
        </View>

        <Text style={styles.bookingSectionTitle}>Đặt lịch khám mới</Text>
        <Text style={styles.bookingSectionSub}>Chọn bác sĩ, ngày khám và khung giờ phù hợp.</Text>

        <SectionCard title="Bác sĩ" hint="Vuốt ngang để xem thêm">
          {!doctors.length ? (
            <Text style={styles.emptyInline}>Chưa có bác sĩ trong hệ thống.</Text>
          ) : (
            <FlatList
              horizontal
              data={doctors}
              keyExtractor={(item, index) => String(item.id || item._id || index)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hRow}
              renderItem={({ item }) => {
                const active = item.id === selectedDoctorId
                return (
                  <Pressable
                    onPress={() => setSelectedDoctorId(item.id)}
                    style={({ pressed }) => [
                      styles.doctorCard,
                      active && styles.doctorCardActive,
                      pressed && styles.doctorCardPressed,
                    ]}
                  >
                    <DoctorAvatar doctor={item} size={44} style={active ? styles.doctorAvatarRing : undefined} />
                    <Text style={[styles.doctorName, active && styles.doctorNameActive]} numberOfLines={2}>
                      {getDoctorFullName(item)}
                    </Text>
                  </Pressable>
                )
              }}
            />
          )}
        </SectionCard>

        <SectionCard title="Ngày khám" hint={selectedDoctor ? `Với ${getDoctorFullName(selectedDoctor)}` : undefined}>
          <FlatList
            horizontal
            data={days}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hRow}
            renderItem={({ item }) => {
              const active = item.key === selectedDate
              return (
                <Pressable
                  onPress={() => setSelectedDate(item.key)}
                  style={({ pressed }) => [
                    styles.dateChip,
                    active && styles.dateChipActive,
                    pressed && styles.dateChipPressed,
                  ]}
                >
                  <Text style={[styles.dateChipTop, active && styles.dateChipTopActive]}>
                    {item.isToday ? 'Hôm nay' : item.weekday}
                  </Text>
                  <Text style={[styles.dateChipDay, active && styles.dateChipDayActive]}>
                    {item.dayNum}/{item.monthNum}
                  </Text>
                  <Text style={[styles.dateChipSub, active && styles.dateChipSubActive]} numberOfLines={1}>
                    {item.labelFull}
                  </Text>
                </Pressable>
              )
            }}
          />
        </SectionCard>

        <SectionCard title="Khung giờ" hint={slotsLoading || !slots.length ? undefined : `${slots.length} suất trống`}>
          {slotsLoading ? (
            <View style={styles.slotsLoading}>
              <ActivityIndicator color={colors.brandBlue} size="small" />
              <Text style={styles.slotsLoadingText}>Đang tải lịch trống…</Text>
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
                      styles.slot,
                      active && styles.slotActive,
                      pressed && styles.slotPressed,
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
              <Text style={styles.slotsEmptySub}>Thử chọn ngày khác hoặc bác sĩ khác.</Text>
            </View>
          )}
        </SectionCard>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Ghi chú</Text>
            <Text style={styles.sectionHint}>Tùy chọn</Text>
          </View>
          <TextField
            label=""
            value={note}
            onChangeText={setNote}
            placeholder="Triệu chứng, thuốc đang dùng hoặc yêu cầu khám"
            multiline
          />
        </View>

        <PrimaryButton
          title={loading ? 'Đang đặt lịch…' : 'Xác nhận đặt lịch'}
          onPress={handleBook}
          loading={loading}
          variant="brand"
        />
      </ScrollView>
    </View>
  )
}

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pageCanvas,
  },
  hero: {
    backgroundColor: colors.brandBlue,
    paddingBottom: 16,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  backIcon: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '300',
    marginTop: -4,
  },
  heroTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  filterBar: {
    backgroundColor: colors.surface,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  filterHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#8b95a1',
    fontWeight: '500',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 4,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    marginRight: 2,
  },
  filterChipIdle: {
    backgroundColor: '#eef1f5',
  },
  filterChipActive: {
    backgroundColor: colors.brandBlue,
  },
  filterChipPressed: {
    opacity: 0.88,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5c6670',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  listSection: {
    gap: 12,
    marginBottom: 8,
  },
  listLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
    justifyContent: 'center',
  },
  listLoadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  listEmpty: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  listEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  listEmptySub: {
    marginTop: 6,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    ...cardShadow,
  },
  ticketCardPressed: {
    opacity: 0.96,
  },
  ticketTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  ticketCodeLine: {
    flex: 1,
    fontSize: 14,
  },
  ticketCodeMuted: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  ticketCodeBold: {
    color: colors.text,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  detailLink: {
    color: colors.brandBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  patientNameCaps: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.2,
    lineHeight: 24,
  },
  dashLine: {
    height: 1,
    backgroundColor: '#cfd8e3',
    marginVertical: 12,
    borderStyle: 'dashed',
  },
  clinicNameCaps: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brandBlue,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  kvRowLast: {
    borderBottomWidth: 0,
    paddingTop: 8,
  },
  kvLabel: {
    width: 96,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  kvValue: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 20,
  },
  kvStatusValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  bookingSectionTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandBlue,
  },
  bookingSectionSub: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    ...cardShadow,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    flexShrink: 1,
    textAlign: 'right',
  },
  hRow: {
    gap: 10,
    paddingRight: 4,
  },
  emptyInline: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  doctorCard: {
    width: 132,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.pageCanvas,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginRight: 10,
  },
  doctorCardActive: {
    borderColor: colors.brandBlue,
    backgroundColor: colors.brandBlueSoft,
  },
  doctorCardPressed: {
    opacity: 0.92,
  },
  doctorAvatarRing: {
    borderWidth: 2,
    borderColor: colors.brandBlue,
  },
  doctorName: {
    marginTop: 8,
    textAlign: 'center',
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 17,
  },
  doctorNameActive: {
    color: colors.brandBlueDark,
  },
  dateChip: {
    minWidth: 76,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.pageCanvas,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  dateChipActive: {
    borderColor: colors.brandBlue,
    backgroundColor: colors.brandBlueSoft,
  },
  dateChipPressed: {
    opacity: 0.92,
  },
  dateChipTop: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dateChipTopActive: {
    color: colors.brandBlueDark,
  },
  dateChipDay: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  dateChipDayActive: {
    color: colors.brandBlueDark,
  },
  dateChipSub: {
    marginTop: 2,
    fontSize: 10,
    color: colors.textMuted,
    maxWidth: 88,
  },
  dateChipSubActive: {
    color: colors.brandBlueDark,
    opacity: 0.85,
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
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slot: {
    minWidth: 76,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.pageCanvas,
    alignItems: 'center',
  },
  slotActive: {
    borderColor: colors.brandBlue,
    backgroundColor: colors.brandBlueSoft,
  },
  slotPressed: {
    opacity: 0.9,
  },
  slotText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: -0.2,
  },
  slotTextActive: {
    color: colors.brandBlueDark,
    fontWeight: '700',
  },
  slotsEmpty: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: colors.pageCanvas,
  },
  slotsEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  slotsEmptySub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
})
