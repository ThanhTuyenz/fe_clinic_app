import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { listDoctors } from '../api/doctors.js'
import { getDoctorScheduleDates } from '../api/appointments.js'
import { listSpecialties } from '../api/specialties.js'
import DoctorAvatar from '../components/DoctorAvatar.js'
import { toDateKey } from '../lib/bookingCalendar.js'
import {
  buildSpecialtyIdLookup,
  deriveConsultWeekdaysLine,
  deriveDoctorTitle,
  formatDoctorPriceVi,
  doctorSpecialtyLine,
  formatConsultWeekdaySetVi,
  weekdayIndicesFromScheduleDates,
  weekdaySetFromDoctorFields,
} from '../lib/doctorProfileUi.js'
import { getSession } from '../lib/session.js'
import { DUPLICATE_PENDING_DOCTOR_MESSAGE, fetchBlockingPendingForDoctor } from '../lib/bookingConstraints.js'
import { getDoctorFullName, formatDateVi } from '../lib/user.js'
import { colors } from '../theme/colors.js'

const SHADOW = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  android: { elevation: 3 },
  default: {},
})

export default function ChooseDoctorScreen({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const listRef = useRef(null)
  const selectedDate = useMemo(() => {
    const s = String(route.params?.selectedDate || '').trim().slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
  }, [route.params?.selectedDate])
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState([])
  const [specialties, setSpecialties] = useState([])
  const [search, setSearch] = useState('')
  const [specialtyFilterKey, setSpecialtyFilterKey] = useState(() => {
    const k = route.params?.specialtyFilterKey
    if (k === undefined || k === null) return ''
    return String(k)
  })
  const [sortKey, setSortKey] = useState('name-asc')
  const [sheet, setSheet] = useState(null)
  const [weekdayLinesByDoctorId, setWeekdayLinesByDoctorId] = useState({})
  const [dateFilterDoctorIds, setDateFilterDoctorIds] = useState(null)

  useLayoutEffect(() => {
    const k = route.params?.specialtyFilterKey
    if (k === undefined || k === null) return
    setSpecialtyFilterKey(String(k))
  }, [route.params?.specialtyFilterKey])

  const load = useCallback(async () => {
    setLoading(true)
    setWeekdayLinesByDoctorId({})
    if (!selectedDate) setDateFilterDoctorIds(null)
    try {
      const session = await getSession()
      const [docRows, specRows] = await Promise.all([listDoctors(), listSpecialties().catch(() => [])])
      setDoctors(docRows)
      setSpecialties(Array.isArray(specRows) ? specRows : [])

      let dateIds = null
      if (selectedDate && session.token && docRows.length) {
        dateIds = new Set()
        await Promise.all(
          docRows.map(async (d) => {
            const id = String(d.id)
            try {
              const dates = await getDoctorScheduleDates({
                token: session.token,
                doctorId: id,
                from: selectedDate,
                to: selectedDate,
              })
              const keys = new Set((Array.isArray(dates) ? dates : []).map((x) => String(x).slice(0, 10)))
              if (keys.has(selectedDate)) dateIds.add(id)
            } catch {
              /* bỏ qua bác sĩ lỗi API */
            }
          }),
        )
      }
      setDateFilterDoctorIds(dateIds)

      const lines = {}
      if (session.token && docRows.length) {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        const from = toDateKey(start)
        const end = new Date(start)
        end.setDate(end.getDate() + 55)
        const to = toDateKey(end)

        await Promise.all(
          docRows.map(async (d) => {
            const id = String(d.id)
            let line = ''
            try {
              const dates = await getDoctorScheduleDates({ token: session.token, doctorId: id, from, to })
              line = formatConsultWeekdaySetVi(weekdayIndicesFromScheduleDates(dates))
            } catch {
              line = ''
            }
            if (!line) {
              const fromDoc = weekdaySetFromDoctorFields(d)
              if (fromDoc) line = formatConsultWeekdaySetVi(fromDoc)
            }
            lines[id] = line
          }),
        )
      }
      setWeekdayLinesByDoctorId(lines)
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không tải được danh sách bác sĩ.')
      setDoctors([])
      setWeekdayLinesByDoctorId({})
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  const specLookup = useMemo(() => buildSpecialtyIdLookup(specialties), [specialties])

  const specialtySheetOptions = useMemo(() => {
    const rows = []
    const seenKeys = new Set()
    const seenLabels = new Set()

    for (const s of specialties) {
      const id = String(s.id || '').trim()
      const name = String(s.name || '').trim()
      if (!id) continue
      const fk = `id:${id}`
      const label = name || 'Chuyên khoa'
      seenKeys.add(fk)
      if (label) seenLabels.add(label.toLowerCase())
      rows.push({ filterKey: fk, label })
    }

    for (const d of doctors) {
      const name = doctorSpecialtyLine(d, specLookup)
      if (!name || name === '—') continue
      const low = name.toLowerCase()
      if (seenLabels.has(low)) continue
      const fk = `name:${low}`
      if (seenKeys.has(fk)) continue
      seenKeys.add(fk)
      seenLabels.add(low)
      rows.push({ filterKey: fk, label: name })
    }

    rows.sort((a, b) => a.label.localeCompare(b.label, 'vi'))
    return [{ filterKey: '', label: 'Tất cả chuyên khoa' }, ...rows]
  }, [specialties, doctors, specLookup])

  const specialtyLabel = useMemo(() => {
    if (!specialtyFilterKey) return 'Chuyên khoa'
    const o = specialtySheetOptions.find((x) => x.filterKey === specialtyFilterKey)
    return o?.label || 'Chuyên khoa'
  }, [specialtyFilterKey, specialtySheetOptions])

  const sortLabel = useMemo(
    () => (sortKey === 'name-desc' ? 'Thứ tự: Z-A' : 'Thứ tự: A-Z'),
    [sortKey],
  )

  const filteredDoctors = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = doctors.slice()

    if (specialtyFilterKey) {
      if (specialtyFilterKey.startsWith('id:')) {
        const id = specialtyFilterKey.slice(3)
        const spec = specialties.find((s) => String(s.id || '') === id)
        const specName = String(spec?.name || '').trim().toLowerCase()
        rows = rows.filter((d) => {
          const sid = String(d.specialtyID || d.specialtyId || '').trim()
          if (sid === id) return true
          if (!specName) return false
          const dn = doctorSpecialtyLine(d, specLookup).toLowerCase()
          if (!dn) return false
          return dn === specName || dn.includes(specName) || specName.includes(dn)
        })
      } else if (specialtyFilterKey.startsWith('name:')) {
        const low = specialtyFilterKey.slice(5)
        rows = rows.filter((d) => doctorSpecialtyLine(d, specLookup).toLowerCase() === low)
      }
    }

    if (q) {
      rows = rows.filter((d) => {
        const name = getDoctorFullName(d).toLowerCase()
        const spec = doctorSpecialtyLine(d, specLookup).toLowerCase()
        return name.includes(q) || spec.includes(q)
      })
    }

    if (dateFilterDoctorIds) {
      rows = rows.filter((d) => dateFilterDoctorIds.has(String(d.id)))
    }

    rows.sort((a, b) => {
      const na = getDoctorFullName(a).toLowerCase()
      const nb = getDoctorFullName(b).toLowerCase()
      if (sortKey === 'name-desc') return nb.localeCompare(na, 'vi')
      return na.localeCompare(nb, 'vi')
    })

    return rows
  }, [doctors, search, sortKey, specialties, specialtyFilterKey, specLookup, dateFilterDoctorIds])

  useEffect(() => {
    if (loading) return
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollTo({ x: 0, y: 0, animated: false })
    })
    return () => cancelAnimationFrame(t)
  }, [loading, specialtyFilterKey, sortKey])

  useEffect(() => {
    if (loading) return
    const tm = setTimeout(() => {
      listRef.current?.scrollTo({ x: 0, y: 0, animated: false })
    }, 400)
    return () => clearTimeout(tm)
  }, [search, loading])

  async function handleChooseDoctor(doctor) {
    const session = await getSession()
    if (!session.token) {
      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để đặt lịch khám.' })
      return
    }
    const did = String(doctor.id || doctor._id || '').trim()
    try {
      const hit = did ? await fetchBlockingPendingForDoctor(session.token, did) : null
      if (hit) {
        Alert.alert('Thông báo', DUPLICATE_PENDING_DOCTOR_MESSAGE)
        return
      }
    } catch {
      // Không chặn đặt lịch nếu không kiểm tra được danh sách lịch
    }
    if (selectedDate) {
      navigation.navigate('ChooseAppointmentSlot', {
        doctorId: String(doctor.id || doctor._id || ''),
        doctor,
        appointmentDate: selectedDate,
      })
    } else {
      navigation.navigate('ChooseAppointmentDate', {
        doctorId: String(doctor.id || doctor._id || ''),
        doctor,
      })
    }
  }

  function openDoctorInfo(doctor) {
    navigation.navigate('DoctorInfo', { doctor })
  }

  function renderSheetOptions() {
    if (sheet === 'specialty') {
      return specialtySheetOptions.map((o) => (
        <Pressable
          key={o.filterKey || 'all'}
          style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
          onPress={() => {
            setSpecialtyFilterKey(o.filterKey)
            setSheet(null)
          }}
        >
          <Text style={[styles.sheetRowText, specialtyFilterKey === o.filterKey && styles.sheetRowTextActive]}>
            {o.label}
          </Text>
          {specialtyFilterKey === o.filterKey ? (
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
          ) : null}
        </Pressable>
      ))
    }
    if (sheet === 'sort') {
      const opts = [
        { id: 'name-asc', name: 'Tên A-Z' },
        { id: 'name-desc', name: 'Tên Z-A' },
      ]
      return opts.map((o) => (
        <Pressable
          key={o.id}
          style={({ pressed }) => [styles.sheetRow, pressed && styles.sheetRowPressed]}
          onPress={() => {
            setSortKey(o.id)
            setSheet(null)
          }}
        >
          <Text style={[styles.sheetRowText, sortKey === o.id && styles.sheetRowTextActive]}>{o.name}</Text>
          {sortKey === o.id ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
        </Pressable>
      ))
    }
    return null
  }

  function renderDoctorCard({ item: doctor }) {
    const spec = doctorSpecialtyLine(doctor, specLookup).toUpperCase()
    const id = String(doctor.id)
    const rawLine = weekdayLinesByDoctorId[id]
    const weekdaysLine =
      rawLine === undefined ? deriveConsultWeekdaysLine(doctor.id) : rawLine || 'Chưa có lịch trong ~8 tuần tới'
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <DoctorAvatar doctor={doctor} size={72} style={styles.cardAvatar} />
          <View style={styles.cardTopRight}>
            <View style={styles.namePill}>
              <Text style={styles.namePillText} numberOfLines={2}>
                {deriveDoctorTitle(doctor)}
              </Text>
            </View>
            <Pressable onPress={() => openDoctorInfo(doctor)} style={styles.infoBtn}>
              <Text style={styles.infoBtnText}>Thông tin bác sĩ &gt;</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.dashLine} />
        <View style={styles.kvRow}>
          <Text style={styles.kvLabel}>Chuyên khoa</Text>
          <View style={styles.kvValWrap}>
            <Text style={styles.kvValue} numberOfLines={3}>
              {spec}
            </Text>
            <Ionicons name="information-circle-outline" size={18} color={colors.brandBlue} style={styles.kvInfoIcon} />
          </View>
        </View>
        {formatDoctorPriceVi(doctor) ? (
          <View style={styles.kvRow}>
            <Text style={styles.kvLabel}>Giá khám</Text>
            <View style={styles.kvValWrap}>
              <Text style={[styles.kvValue, styles.kvPrice]}>{formatDoctorPriceVi(doctor)}</Text>
            </View>
          </View>
        ) : null}
        <Text style={styles.sessionSectionTitle}>Ngày khám trong tuần</Text>
        <View style={styles.sessionRow}>
          <Text style={styles.weekdayLine} numberOfLines={3}>
            {weekdaysLine}
          </Text>
          <Pressable style={styles.chooseBtn} onPress={() => handleChooseDoctor(doctor)}>
            <Text style={styles.chooseBtnText}>Chọn</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerBack}>
          <Ionicons name="chevron-back" size={26} color={colors.brandBlue} />
        </Pressable>
        <Text style={styles.headerTitle}>Chọn bác sĩ</Text>
        <View style={styles.headerBackPlaceholder} />
      </View>

      {selectedDate ? (
        <View style={styles.dateFilterBanner}>
          <Ionicons name="calendar-outline" size={18} color={colors.brandBlue} />
          <Text style={styles.dateFilterBannerText} numberOfLines={2}>
            Có lịch ngày {formatDateVi(selectedDate)}
          </Text>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm kiếm bác sĩ…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filterRowWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          style={styles.filterScroller}
        >
          <Pressable style={styles.filterPill} onPress={() => setSheet('specialty')}>
            <Text style={styles.filterPillText} numberOfLines={1}>
              {specialtyFilterKey ? specialtyLabel : 'Chuyên khoa'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
          <Pressable style={styles.filterPill} onPress={() => setSheet('sort')}>
            <Text style={styles.filterPillText} numberOfLines={1}>
              {sortLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
          </Pressable>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.brandBlue} />
          <Text style={styles.loadingText}>Đang tải danh sách…</Text>
        </View>
      ) : (
        <ScrollView
          ref={listRef}
          style={styles.list}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 24 },
            filteredDoctors.length === 0 ? styles.listEmpty : styles.listScrollBody,
          ]}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
        >
          {filteredDoctors.length === 0 ? (
            <Text style={styles.emptyText}>
              {selectedDate && dateFilterDoctorIds && dateFilterDoctorIds.size === 0
                ? 'Không có bác sĩ có lịch vào ngày đã chọn. Quay lại để chọn ngày khác.'
                : 'Không có bác sĩ phù hợp. Thử đổi bộ lọc hoặc từ khóa.'}
            </Text>
          ) : (
            filteredDoctors.map((doctor) => (
              <Fragment key={String(doctor.id)}>{renderDoctorCard({ item: doctor })}</Fragment>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={sheet != null} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={[styles.sheetBox, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>
              {sheet === 'specialty' ? 'Chuyên khoa' : sheet === 'sort' ? 'Thứ tự' : ''}
            </Text>
            <ScrollView style={styles.sheetScroll} keyboardShouldPersistTaps="handled">
              {renderSheetOptions()}
            </ScrollView>
            <Pressable style={styles.sheetClose} onPress={() => setSheet(null)}>
              <Text style={styles.sheetCloseText}>Đóng</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pageCanvas,
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
  headerBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackPlaceholder: { width: 44 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.brandBlue,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 15,
    color: colors.text,
  },
  filterRowWrap: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterScroller: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
    flexShrink: 0,
    maxWidth: 280,
    minHeight: 40,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 0,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  listScrollBody: {
    flexGrow: 0,
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  card: {
    flexGrow: 0,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    ...SHADOW,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardAvatar: {
    borderRadius: 14,
  },
  cardTopRight: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'flex-start',
  },
  namePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandBlueSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  namePillText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandBlueDark,
    lineHeight: 19,
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
  dashLine: {
    marginVertical: 14,
    height: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#cfd8e3',
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  kvLabel: {
    width: 88,
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  kvValWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    gap: 6,
  },
  kvValue: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  kvPrice: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  kvInfoIcon: {
    marginTop: 2,
  },
  sessionSectionTitle: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 6,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  weekdayLine: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flexGrow: 1,
    flexShrink: 1,
    paddingRight: 8,
    lineHeight: 20,
  },
  chooseBtn: {
    backgroundColor: colors.brandBlue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  chooseBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 16,
    maxHeight: '70%',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  sheetScroll: {
    maxHeight: 360,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetRowPressed: {
    opacity: 0.85,
  },
  sheetRowText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  sheetRowTextActive: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  sheetClose: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  sheetCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
})
