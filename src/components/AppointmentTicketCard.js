import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { getAppointmentSpecialtyLine, getTicketDisplay, resolveAppointmentPatientLine } from '../lib/appointmentCard.js'
import { isAppointmentCancelled } from '../lib/appointmentRebook.js'
import { formatDateVi, getDoctorFullName } from '../lib/user.js'
import { colors } from '../theme/colors.js'
import PrimaryButton from './PrimaryButton.js'
import StatusBadge from './StatusBadge.js'

function getAppointmentRowId(appointment) {
  return String(appointment?.id || appointment?._id || '')
}

export default function AppointmentTicketCard({
  appointment,
  sessionUser,
  onOpenDetail,
  pressable = true,
  showFooterActions = false,
  canCancel = false,
  onCancel,
  cancelling = false,
  onRebook,
  onFollowUp,
}) {
  const id = getAppointmentRowId(appointment)
  const ticket = getTicketDisplay(appointment)
  const { name: patientName } = resolveAppointmentPatientLine(appointment, sessionUser)
  const doctorName =
    getDoctorFullName(appointment?.doctor) || String(appointment?.doctorName || '').trim() || '—'
  const specialty = getAppointmentSpecialtyLine(appointment)
  const dateRaw = appointment?.appointmentDate || appointment?.date
  const dateLabel = dateRaw ? formatDateVi(dateRaw) : '—'
  const timeLabel = String(appointment?.startTime || '').trim().slice(0, 5) || '—'
  const slotLabel =
    dateLabel !== '—' && timeLabel !== '—' ? `${dateLabel} · ${timeLabel}` : dateLabel !== '—' ? dateLabel : timeLabel
  const cancelled = isAppointmentCancelled(appointment)

  const openDetail = () => {
    if (id && onOpenDetail) onOpenDetail(id, appointment)
  }

  const body = (
    <>
      <View style={styles.ticketTop}>
        <Text style={styles.ticketCodeLine}>
          <Text style={styles.ticketCodeMuted}>Mã lịch hẹn: </Text>
          <Text style={styles.ticketCodeBold}>{ticket}</Text>
        </Text>
        {!showFooterActions ? (
          <Pressable onPress={openDetail} hitSlop={8}>
            <Text style={styles.detailLink}>Xem chi tiết ›</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.patientNameCaps} numberOfLines={2}>
        {patientName.toUpperCase()}
      </Text>
      <View style={styles.dashLine} />
      <Text style={styles.doctorNameLine} numberOfLines={2}>
        {doctorName}
      </Text>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Chuyên khoa</Text>
        <Text style={styles.kvValue}>{specialty}</Text>
      </View>
      <View style={styles.kvRow}>
        <Text style={styles.kvLabel}>Giờ khám</Text>
        <Text style={styles.kvValue}>{slotLabel}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Trạng thái</Text>
        <StatusBadge status={appointment?.status} />
      </View>
      {showFooterActions ? (
        <View style={styles.footer}>
          <PrimaryButton title="Chi tiết" variant="secondary" onPress={openDetail} />
          {canCancel ? (
            <Pressable onPress={onCancel} disabled={cancelling}>
              <Text style={styles.cancelLink}>{cancelling ? 'Đang hủy…' : 'Hủy lịch'}</Text>
            </Pressable>
          ) : null}
          {cancelled && onRebook ? (
            <PrimaryButton title="Đặt lại" variant="brand" onPress={() => onRebook(appointment)} />
          ) : null}
          {onFollowUp ? (
            <PrimaryButton title="Tái khám" variant="brand" onPress={() => onFollowUp(appointment)} />
          ) : null}
        </View>
      ) : null}
    </>
  )

  if (!pressable || showFooterActions) {
    return <View style={styles.ticketCard}>{body}</View>
  }

  return (
    <Pressable
      onPress={openDetail}
      disabled={!id}
      style={({ pressed }) => [styles.ticketCard, pressed && styles.ticketCardPressed]}
    >
      {body}
    </Pressable>
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
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    marginBottom: 12,
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
  },
  doctorNameLine: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brandBlue,
    letterSpacing: 0.2,
    marginBottom: 12,
    lineHeight: 20,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  footer: {
    marginTop: 14,
    gap: 10,
  },
  cancelLink: {
    color: colors.danger,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
})
