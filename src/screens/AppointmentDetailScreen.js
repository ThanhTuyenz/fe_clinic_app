import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
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
import Ionicons from '@expo/vector-icons/Ionicons'
import QRCode from 'react-native-qrcode-svg'
import { cancelAppointment, getAppointment } from '../api/appointments.js'
import CancelAppointmentModal from '../components/CancelAppointmentModal.js'
import DoctorAvatar from '../components/DoctorAvatar.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import StatusBadge from '../components/StatusBadge.js'
import {
  getAppointmentSpecialtyLine,
  getClinicTitle,
  getTicketDisplay,
  resolveAppointmentPatientLine,
} from '../lib/appointmentCard.js'
import { isAppointmentCancelled, navigateDoctorBookingFromRebook } from '../lib/appointmentRebook.js'
import { APPOINTMENT_STATUS_LEGEND, getAppointmentStatusKind } from '../lib/appointmentStatus.js'
import { getSession } from '../lib/session.js'
import { formatDateVi, getDoctorFullName, resolvePatientCode } from '../lib/user.js'
import { DEFAULT_SLOT_MINUTES, isPendingAppointmentPastSlot } from '../utils/appointmentExpiry.js'
import { colors } from '../theme/colors.js'

function addMinutesToHHmm(hhmm, minutes) {
  const [hh, mm] = String(hhmm || '00:00')
    .split(':')
    .map((v) => Number(v))
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return hhmm
  const d = new Date()
  d.setHours(hh)
  d.setMinutes(mm + minutes)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function periodLabel(startTime) {
  const h = Number(String(startTime || '12:00').split(':')[0])
  if (!Number.isFinite(h)) return ''
  if (h < 12) return 'Buổi sáng'
  if (h < 18) return 'Buổi chiều'
  return 'Buổi tối'
}

function formatGender(value) {
  if (value === true || value === 'male' || value === 'Nam') return 'Nam'
  if (value === false || value === 'female' || value === 'Nữ') return 'Nữ'
  if (typeof value === 'string' && value.trim()) return value.trim()
  return '—'
}

function DetailRow({ label, value, multiline }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailKey}>{label}</Text>
      <Text style={[styles.detailVal, multiline && styles.detailValMulti]} numberOfLines={multiline ? 4 : 2}>
        {value || '—'}
      </Text>
    </View>
  )
}

function SectionCard({ title, children }) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

export default function AppointmentDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const appointmentId = route.params?.appointmentId
  const initialAppointment = route.params?.appointment || null
  const bookingSuccess = Boolean(route.params?.bookingSuccess)
  const successMessage = String(route.params?.successMessage || 'Đăng ký lịch khám thành công!')
  const [row, setRow] = useState(initialAppointment)
  const [sessionUser, setSessionUser] = useState(null)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(!initialAppointment)
  const [cancelling, setCancelling] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelModalError, setCancelModalError] = useState('')

  const loadDetail = useCallback(async () => {
    if (!appointmentId) {
      setError('Không tìm thấy mã lịch khám.')
      setLoading(false)
      return
    }
    setError('')
    const session = await getSession()
    if (!session.token) {
      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để xem chi tiết lịch khám.' })
      return
    }
    setToken(session.token)
    setSessionUser(session.user || null)
    if (!initialAppointment) setLoading(true)
    try {
      const data = await getAppointment({ token: session.token, appointmentId })
      setRow(data)
    } catch (err) {
      if (!initialAppointment) setRow(null)
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

  const view = useMemo(() => {
    if (!row) return null
    const ticket = getTicketDisplay(row)
    const { name: patientName, code: patientCode } = resolveAppointmentPatientLine(row, sessionUser)
    const doctor = row.doctor
    const doctorName = getDoctorFullName(doctor) || String(row.doctorName || '').trim() || '—'
    const specialty = getAppointmentSpecialtyLine(row)
    const dateRaw = row.appointmentDate || row.date
    const dateVi = dateRaw ? formatDateVi(dateRaw) : '—'
    const start = String(row.startTime || '').trim().slice(0, 5)
    const end = String(row.endTime || '').trim().slice(0, 5) || addMinutesToHHmm(start, DEFAULT_SLOT_MINUTES)
    const period = periodLabel(start)
    const timeLine = start ? `${start}${end ? ` – ${end}` : ''}${period ? ` · ${period}` : ''}` : '—'
    const statusKind = getAppointmentStatusKind(row.status)
    const statusHint = APPOINTMENT_STATUS_LEGEND.find((x) => x.kind === statusKind)?.hint || ''
    const profile = row.patient && typeof row.patient === 'object' ? row.patient : sessionUser
    const patientDob = profile?.dob ? formatDateVi(profile.dob) : '—'
    const patientGender = formatGender(profile?.gender)
    const note = String(row.note || '').trim()

    return {
      ticket,
      patientName,
      patientCode,
      patientDob,
      patientGender,
      doctorName,
      specialty,
      dateVi,
      timeLine,
      statusHint,
      note,
    }
  }, [row, sessionUser])

  const canCancel = useMemo(() => {
    if (!row) return false
    return String(row.status || '').toLowerCase() === 'pending' && !isPendingAppointmentPastSlot(row)
  }, [row])

  const cancelled = useMemo(() => isAppointmentCancelled(row), [row])

  function handleRebook() {
    if (!row) return
    navigateDoctorBookingFromRebook(navigation, row)
  }

  function openCancelModal() {
    if (!canCancel) return
    setCancelModalError('')
    setCancelModalOpen(true)
  }

  function closeCancelModal() {
    if (cancelling) return
    setCancelModalOpen(false)
    setCancelModalError('')
  }

  async function confirmCancel(cancelReason) {
    if (!token || !appointmentId || !canCancel) return
    setCancelling(true)
    setCancelModalError('')
    setError('')
    setInfo('')
    try {
      await cancelAppointment({ token, appointmentId, cancelReason })
      setCancelModalOpen(false)
      setInfo('Đã hủy lịch khám.')
      await loadDetail()
    } catch (err) {
      setCancelModalError(err.message || 'Không hủy được lịch khám.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandBlue} />
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <View style={styles.heroRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </Pressable>
          <Text style={styles.heroTitle}>Chi tiết lịch hẹn</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <MessageBanner message={error} />
        <MessageBanner message={info} tone="info" />
        {bookingSuccess ? (
          <View style={styles.successBanner}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={28} color="#059669" />
            </View>
            <View style={styles.successTextWrap}>
              <Text style={styles.successTitle}>Đăng ký thành công!</Text>
              <Text style={styles.successSub}>{successMessage}</Text>
            </View>
          </View>
        ) : null}

        {loading && !row ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.brandBlue} />
            <Text style={styles.loadingText}>Đang tải thông tin…</Text>
          </View>
        ) : null}

        {view ? (
          <View style={styles.contentColumn}>
            <View style={styles.ticketHero}>
              <View style={styles.qrWrap}>
                <QRCode value={view.ticket} size={112} color={colors.text} backgroundColor="#fff" />
              </View>
              <Text style={styles.ticketLabel}>Mã lịch hẹn</Text>
              <Text style={styles.ticketCode}>{view.ticket}</Text>
              <StatusBadge status={row.status} style={styles.heroBadge} />
              {view.statusHint ? <Text style={styles.statusHint}>{view.statusHint}</Text> : null}
            </View>

            <View style={styles.doctorCard}>
              <DoctorAvatar doctor={row.doctor} size={56} style={styles.doctorAvatar} />
              <View style={styles.doctorMeta}>
                <Text style={styles.doctorName}>{view.doctorName}</Text>
                <Text style={styles.doctorSpec}>{view.specialty}</Text>
                <Text style={styles.clinicSub}>{getClinicTitle()}</Text>
              </View>
            </View>

            <SectionCard title="Thông tin đặt lịch">
              <DetailRow label="Ngày khám" value={view.dateVi} />
              <DetailRow label="Giờ khám" value={view.timeLine} />
              <DetailRow label="Chuyên khoa" value={view.specialty} />
            </SectionCard>

            <SectionCard title="Thông tin bệnh nhân">
              <DetailRow label="Họ và tên" value={view.patientName} />
              <DetailRow label="Mã bệnh nhân" value={view.patientCode} />
              <DetailRow label="Ngày sinh" value={view.patientDob} />
              <DetailRow label="Giới tính" value={view.patientGender} />
              {view.note ? <DetailRow label="Ghi chú" value={view.note} multiline /> : null}
            </SectionCard>

            {canCancel || cancelled ? (
              <View style={styles.actions}>
                {canCancel ? (
                  <PrimaryButton
                    title={cancelling ? 'Đang hủy…' : 'Hủy lịch khám'}
                    variant="secondary"
                    onPress={openCancelModal}
                    loading={cancelling}
                    disabled={cancelling}
                  />
                ) : null}
                {cancelled ? (
                  <PrimaryButton title="Đặt lại" variant="brand" onPress={handleRebook} />
                ) : null}
              </View>
            ) : null}
          </View>
        ) : !loading ? (
          <Text style={styles.emptyText}>Không có dữ liệu lịch khám.</Text>
        ) : null}
      </ScrollView>

      <CancelAppointmentModal
        visible={cancelModalOpen}
        loading={cancelling}
        error={cancelModalError}
        onClose={closeCancelModal}
        onConfirm={confirmCancel}
      />
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
    paddingBottom: 14,
    paddingHorizontal: 12,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  heroTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  successBanner: {
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86efac',
    backgroundColor: '#ecfdf5',
  },
  successIconWrap: {
    flexShrink: 0,
  },
  successTextWrap: {
    flex: 1,
    gap: 2,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#047857',
  },
  successSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#065f46',
  },
  contentColumn: {
    width: '100%',
    maxWidth: 360,
    gap: 14,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    paddingVertical: 32,
  },
  ticketHero: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  qrWrap: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
  },
  ticketLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  ticketCode: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
  },
  heroBadge: {
    marginTop: 14,
    alignSelf: 'center',
  },
  statusHint: {
    marginTop: 10,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  doctorAvatar: {
    borderWidth: 2,
    borderColor: colors.brandBlueSoft,
  },
  doctorMeta: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 22,
  },
  doctorSpec: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandBlue,
    marginTop: 2,
  },
  clinicSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  detailKey: {
    width: 108,
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  detailVal: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    lineHeight: 20,
  },
  detailValMulti: {
    textAlign: 'right',
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
})
