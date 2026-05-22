import { Platform, StyleSheet, Text, View } from 'react-native'
import { appointmentStatusPalette, getAppointmentStatusKind, getAppointmentStatusLabel } from '../lib/appointmentStatus.js'

export default function StatusBadge({ status, style, size = 'md' }) {
  const kind = getAppointmentStatusKind(status)
  const palette = appointmentStatusPalette[kind]
  const label = getAppointmentStatusLabel(status)
  const compact = size === 'sm'

  return (
    <View
      style={[
        styles.badge,
        compact && styles.badgeSm,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      <View style={[styles.dot, compact && styles.dotSm, { backgroundColor: palette.dot }]} />
      <Text style={[styles.text, compact && styles.textSm, { color: palette.text }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  badgeSm: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSm: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  textSm: {
    fontSize: 12,
  },
})
