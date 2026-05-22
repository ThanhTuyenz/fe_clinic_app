import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { colors } from '../theme/colors.js'

export const APPOINTMENT_STATUS_FILTER_TABS = [
  { id: 'booked', label: 'Đã đặt lịch' },
  { id: 'done', label: 'Đã khám' },
  { id: 'cancelled', label: 'Đã hủy' },
]

export default function AppointmentStatusFilter({ value, onChange, count, countLabel = 'phiếu' }) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {APPOINTMENT_STATUS_FILTER_TABS.map((tab) => {
          const active = value === tab.id
          return (
            <Pressable
              key={tab.id}
              onPress={() => onChange(active ? '' : tab.id)}
              style={({ pressed }) => [
                styles.chip,
                active ? styles.chipActive : styles.chipIdle,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{tab.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {typeof count === 'number' ? (
        <Text style={styles.hint} numberOfLines={1}>
          {count} {countLabel}
          {value ? ` · ${APPOINTMENT_STATUS_FILTER_TABS.find((t) => t.id === value)?.label || ''}` : ' · Tất cả trạng thái'}
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
  },
  chipIdle: {
    backgroundColor: '#eef1f5',
  },
  chipActive: {
    backgroundColor: colors.brandBlue,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5c6670',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    color: '#8b95a1',
    fontWeight: '500',
  },
})
