import { useCallback, useEffect, useMemo, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { getDoctorScheduleDates, listMyAppointments } from '../api/appointments.js'
import { listDoctors } from '../api/doctors.js'
import { listSpecialties } from '../api/specialties.js'
import { getSession } from '../lib/session.js'
import {
  buildSpecialtyIdLookup,
  filterDoctorsBySpecialtyFilterKey,
} from '../lib/doctorProfileUi.js'
import {
  buildMonthGrid,
  isVnPublicHoliday,
  monthRangeKeys,
  toDateKey,
  WEEKDAY_VI_GRID,
} from '../lib/bookingCalendar.js'
import {
  DUPLICATE_PENDING_DOCTOR_MESSAGE,
  findBlockingPendingAppointmentForDoctor,
} from '../lib/bookingConstraints.js'
import { colors } from '../theme/colors.js'

function startOfThisMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

export default function ChooseAppointmentDateScreen({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const dateFirst = Boolean(route.params?.dateFirst)
  const specialtyFirst = Boolean(route.params?.specialtyFirst)
  const specialtyFilterKey = String(route.params?.specialtyFilterKey ?? '')
  const doctorId = String(
    route.params?.doctorId || route.params?.doctor?.id || route.params?.doctor?._id || '',
  ).trim()
  const doctorFromParams = route.params?.doctor

  const today = useMemo(() => {
    const t = new Date()
    t.setHours(0, 0, 0, 0)
    return t
  }, [])

  const [viewYear, setViewYear] = useState(() => today.getFullYear())
  const [viewMonth, setViewMonth] = useState(() => today.getMonth() + 1)
  const [scheduleDates, setScheduleDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [doctor, setDoctor] = useState(doctorFromParams || null)
  const [myBookings, setMyBookings] = useState([])

  useFocusEffect(
    useCallback(() => {
      if (!doctorId || dateFirst || specialtyFirst) return undefined
      let cancelled = false
      ;(async () => {
        const session = await getSession()
        if (!session.token) return
        try {
          const rows = await listMyAppointments({ token: session.token })
          if (!cancelled) setMyBookings(Array.isArray(rows) ? rows : [])
        } catch {
          if (!cancelled) setMyBookings([])
        }
      })()
      return () => {
        cancelled = true
      }
    }, [dateFirst, doctorId, specialtyFirst]),
  )

  useEffect(() => {
    if (doctorFromParams) setDoctor(doctorFromParams)
  }, [doctorFromParams])

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

  const loadMonth = useCallback(async () => {
    setLoading(true)
    try {
      const session = await getSession()
      if (!session.token) {
        navigation.replace('Login', { message: 'Vui lòng đăng nhập để đặt lịch khám.' })
        return
      }
      const { from, to } = monthRangeKeys(viewYear, viewMonth)
      if (dateFirst) {
        const docRows = await listDoctors()
        const merge = new Set()
        await Promise.all(
          (docRows || []).map(async (d) => {
            const id = String(d.id || d._id || '').trim()
            if (!id) return
            try {
              const dates = await getDoctorScheduleDates({
                token: session.token,
                doctorId: id,
                from,
                to,
              })
              for (const x of Array.isArray(dates) ? dates : []) {
                const k = String(x).slice(0, 10)
                if (k) merge.add(k)
              }
            } catch {
              /* bỏ qua */
            }
          }),
        )
        setScheduleDates([...merge].sort())
      } else if (specialtyFirst) {
        const [docRows, specRows] = await Promise.all([listDoctors(), listSpecialties().catch(() => [])])
        const specs = Array.isArray(specRows) ? specRows : []
        const specLookup = buildSpecialtyIdLookup(specs)
        const candidates = filterDoctorsBySpecialtyFilterKey(docRows || [], specialtyFilterKey, specs, specLookup)
        const merge = new Set()
        await Promise.all(
          candidates.map(async (d) => {
            const id = String(d.id || d._id || '').trim()
            if (!id) return
            try {
              const dates = await getDoctorScheduleDates({
                token: session.token,
                doctorId: id,
                from,
                to,
              })
              for (const x of Array.isArray(dates) ? dates : []) {
                const k = String(x).slice(0, 10)
                if (k) merge.add(k)
              }
            } catch {
              /* bỏ qua */
            }
          }),
        )
        setScheduleDates([...merge].sort())
      } else {
        if (!doctorId) {
          setScheduleDates([])
          return
        }
        const dates = await getDoctorScheduleDates({ token: session.token, doctorId, from, to })
        setScheduleDates(Array.isArray(dates) ? dates : [])
      }
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không tải được lịch.')
      setScheduleDates([])
    } finally {
      setLoading(false)
    }
  }, [dateFirst, doctorId, navigation, specialtyFilterKey, specialtyFirst, viewMonth, viewYear])

  useEffect(() => {
    loadMonth()
  }, [loadMonth])

  const scheduleSet = useMemo(() => new Set(scheduleDates.map(String)), [scheduleDates])

  const monthLabel = `Tháng ${String(viewMonth).padStart(2, '0')} - ${viewYear}`

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewMonth, viewYear])

  const canPrevMonth = useMemo(() => {
    const first = new Date(viewYear, viewMonth - 1, 1)
    return first > startOfThisMonth(today)
  }, [today, viewMonth, viewYear])

  function goPrevMonth() {
    if (!canPrevMonth) return
    const d = new Date(viewYear, viewMonth - 2, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth() + 1)
  }

  function goNextMonth() {
    const d = new Date(viewYear, viewMonth, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth() + 1)
  }

  function onPickDay(date) {
    const key = toDateKey(date)
    if (key < toDateKey(today)) return
    if (!scheduleSet.has(key)) return
    if (dateFirst) {
      navigation.navigate('ChooseSpecialty', { selectedDate: key })
      return
    }
    if (specialtyFirst) {
      navigation.navigate('ChooseDoctor', { selectedDate: key, specialtyFilterKey })
      return
    }
    if (findBlockingPendingAppointmentForDoctor(myBookings, doctorId)) {
      Alert.alert('Thông báo', DUPLICATE_PENDING_DOCTOR_MESSAGE)
      return
    }
    navigation.navigate('ChooseAppointmentSlot', {
      doctorId,
      doctor: doctor || undefined,
      appointmentDate: key,
    })
  }

  if (!doctorId && !dateFirst && !specialtyFirst) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.fallbackText}>Thiếu bác sĩ.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.fallbackBtn}>
          <Text style={styles.fallbackBtnText}>Quay lại</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={26} color={colors.brandBlue} />
        </Pressable>
        <Text style={styles.headerTitle}>Chọn ngày khám</Text>
        <Pressable onPress={() => navigation.navigate('MainTabs')} hitSlop={12} style={styles.headerIcon}>
          <Ionicons name="home-outline" size={24} color={colors.brandBlue} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.monthRow}>
          <Pressable
            onPress={goPrevMonth}
            disabled={!canPrevMonth}
            style={[styles.monthNav, !canPrevMonth && styles.monthNavDisabled]}
          >
            <Ionicons name="chevron-back" size={22} color={canPrevMonth ? colors.brandBlue : colors.textMuted} />
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable onPress={goNextMonth} style={styles.monthNav}>
            <Ionicons name="chevron-forward" size={22} color={colors.brandBlue} />
          </Pressable>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_VI_GRID.map((w) => (
            <Text key={w} style={styles.weekCell}>
              {w}
            </Text>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.brandBlue} size="large" />
            <Text style={styles.loadingText}>Đang tải lịch…</Text>
          </View>
        ) : (
          <View style={styles.gridWrap}>
            {grid.map((cell, idx) => {
              if (cell.kind === 'pad') {
                return <View key={`p-${idx}`} style={styles.dayCellPad} />
              }
              const { date, day, weekday } = cell
              const key = toDateKey(date)
              const todayKey = toDateKey(today)
              const isPast = key < todayKey
              const isToday = key === todayKey
              const selectable = !isPast && scheduleSet.has(key)
              const sundayOff = weekday === 0 && !selectable && !isPast
              const holiday = isVnPublicHoliday(date) && !selectable && !isPast
              let sub = ''
              if (isPast) sub = ''
              else if (selectable) sub = ''
              else if (holiday) sub = 'Ngày lễ'
              else if (sundayOff) sub = 'Ngày nghỉ'

              return (
                <Pressable
                  key={key}
                  onPress={() => onPickDay(date)}
                  disabled={!selectable}
                  style={({ pressed }) => [
                    styles.dayCell,
                    selectable && styles.daySelectable,
                    selectable && pressed && styles.dayPressed,
                    isToday && styles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      selectable && styles.dayNumSelectable,
                      !selectable && styles.dayNumMuted,
                    ]}
                  >
                    {day}
                  </Text>
                  {isToday ? (
                <Text style={[styles.todayTag, selectable && styles.todayTagOnBlue]}>Hôm nay</Text>
              ) : null}
                  {sub ? (
                    <Text style={styles.daySub} numberOfLines={1}>
                      {sub}
                    </Text>
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        )}

        <View style={styles.calendarHintBlock}>
          <View style={styles.hintBox}>
            <View style={styles.hintBar} />
            <Text style={styles.hintText}>
              {dateFirst
                ? 'Ngày màu xanh: có ít nhất một bác sĩ có lịch khám. Sau khi chọn ngày, bạn chọn chuyên khoa rồi danh sách bác sĩ có lịch đúng ngày đó.'
                : specialtyFirst
                  ? 'Ngày màu xanh: có ít nhất một bác sĩ thuộc chuyên khoa đã chọn có lịch. Sau đó chọn bác sĩ còn lịch trong ngày đó.'
                  : 'Chọn ngày có màu xanh dương để đặt khám.'}
            </Text>
          </View>

          <View style={styles.legend}>
            <View style={styles.legendRow}>
              <View style={[styles.legendSwatch, styles.swatchOk]} />
              <Text style={styles.legendText}>Ngày có thể chọn khám</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendSwatch, styles.swatchNo]} />
              <Text style={styles.legendText}>Ngày không chọn khám</Text>
            </View>
            <View style={styles.legendRow}>
              <View style={[styles.legendSwatch, styles.swatchHoliday]} />
              <Text style={styles.legendText}>Ngày Lễ, Tết</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
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
  scroll: { flex: 1, backgroundColor: colors.surface },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    flexGrow: 0,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  monthNav: {
    width: 44,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandBlueSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavDisabled: {
    opacity: 0.45,
    backgroundColor: colors.pageCanvas,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.brandBlue,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekCell: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  loadingBox: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellPad: {
    width: `${100 / 7}%`,
    aspectRatio: 0.72,
    marginBottom: 6,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.72,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: colors.pageCanvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e8edf2',
  },
  daySelectable: {
    backgroundColor: colors.brandBlue,
    borderColor: colors.brandBlue,
  },
  dayPressed: {
    opacity: 0.9,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dayNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  dayNumSelectable: {
    color: '#fff',
  },
  dayNumMuted: {
    color: colors.textMuted,
    opacity: 0.85,
  },
  todayTag: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: '600',
    color: colors.textMuted,
  },
  todayTagOnBlue: {
    color: 'rgba(255,255,255,0.92)',
  },
  daySub: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  calendarHintBlock: {
    marginTop: 10,
    gap: 10,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  hintBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    backgroundColor: colors.brandBlue,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  legend: {
    gap: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendSwatch: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchOk: {
    backgroundColor: colors.brandBlue,
    borderColor: colors.brandBlue,
  },
  swatchNo: {
    backgroundColor: colors.pageCanvas,
  },
  swatchHoliday: {
    backgroundColor: '#fdba74',
    borderColor: '#ea580c',
  },
  legendText: {
    fontSize: 13,
    color: colors.text,
  },
  fallbackText: {
    textAlign: 'center',
    marginTop: 24,
    color: colors.textMuted,
  },
  fallbackBtn: {
    marginTop: 16,
    alignSelf: 'center',
    padding: 12,
  },
  fallbackBtnText: {
    color: colors.brandBlue,
    fontWeight: '700',
  },
})
