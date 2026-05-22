import { useCallback, useEffect, useMemo, useState } from 'react'

import {

  ActivityIndicator,

  Alert,

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

import Ionicons from '@expo/vector-icons/Ionicons'

import { createAppointment, getAvailability, getDoctorScheduleDates } from '../api/appointments.js'

import { listDoctors } from '../api/doctors.js'

import { listSpecialties } from '../api/specialties.js'

import DoctorAvatar from '../components/DoctorAvatar.js'

import MessageBanner from '../components/MessageBanner.js'

import PrimaryButton from '../components/PrimaryButton.js'

import TextField from '../components/TextField.js'

import { getSession } from '../lib/session.js'

import { DUPLICATE_PENDING_DOCTOR_MESSAGE, SLOT_OVERLAP_APPOINTMENT_MESSAGE, fetchBlockingForNewSlot, fetchBlockingPendingForDoctor } from '../lib/bookingConstraints.js'

import { formatDoctorPriceVi } from '../lib/doctorProfileUi.js'
import { formatDateVi, getDoctorFullName } from '../lib/user.js'

import { colors } from '../theme/colors.js'



const WEEKDAY_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']



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



export default function AppointmentScreen({ navigation, route }) {

  const insets = useSafeAreaInsets()

  const days = useMemo(() => buildNextDays(), [])

  const [token, setToken] = useState('')

  const [doctors, setDoctors] = useState([])

  const [selectedDoctorId, setSelectedDoctorId] = useState('')

  const [selectedDate, setSelectedDate] = useState(days[0]?.key || '')

  const [slots, setSlots] = useState([])

  const [slotShifts, setSlotShifts] = useState([])

  const [scheduleDates, setScheduleDates] = useState([])

  const [datesLoading, setDatesLoading] = useState(false)

  const [selectedSlot, setSelectedSlot] = useState('')

  const [note, setNote] = useState('')

  const [error, setError] = useState('')

  const [info, setInfo] = useState('')

  const [loading, setLoading] = useState(false)

  const [slotsLoading, setSlotsLoading] = useState(false)

  const [screenLoading, setScreenLoading] = useState(true)

  const [prefillDate, setPrefillDate] = useState('')

  const [bookingMode, setBookingMode] = useState('doctor')

  const [hideDoctorPicker, setHideDoctorPicker] = useState(false)

  const [specialties, setSpecialties] = useState([])

  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState('')



  const loadScreen = useCallback(async () => {

    setError('')

    const session = await getSession()

    if (!session.token) {

      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để đăng ký lịch khám.' })

      return

    }

    setToken(session.token)

    setScreenLoading(true)

    try {

      const [doctorRows, specRows] = await Promise.all([listDoctors(), listSpecialties().catch(() => [])])

      setDoctors(doctorRows)

      setSpecialties(Array.isArray(specRows) ? specRows : [])

      if (!selectedDoctorId && doctorRows[0]?.id) {

        setSelectedDoctorId(doctorRows[0].id)

      }

    } catch (err) {

      setError(err.message || 'Không tải được danh sách bác sĩ.')

    } finally {

      setScreenLoading(false)

    }

  }, [navigation, selectedDoctorId])



  const loadScheduleDates = useCallback(async () => {

    if (!token || !selectedDoctorId) {

      setScheduleDates([])

      return

    }

    setDatesLoading(true)

    try {

      const from = days[0]?.key

      const to = days[days.length - 1]?.key

      const dates = await getDoctorScheduleDates({ token, doctorId: selectedDoctorId, from, to })

      setScheduleDates(dates)

      if (prefillDate && dates.includes(prefillDate)) {
        setSelectedDate(prefillDate)
        setPrefillDate('')
      } else if (dates.length && (!selectedDate || !dates.includes(selectedDate))) {
        setSelectedDate(dates[0])
      }

    } catch {

      setScheduleDates([])

    } finally {

      setDatesLoading(false)

    }

  }, [days, prefillDate, selectedDate, selectedDoctorId, token])



  const loadSlots = useCallback(async () => {

    if (!token || !selectedDoctorId || !selectedDate) return

    setSlotsLoading(true)

    setError('')

    try {

      const data = await getAvailability({ token, doctorId: selectedDoctorId, date: selectedDate })

      setSlots(data.slots || [])

      setSlotShifts(data.shifts || [])

      setSelectedSlot('')

    } catch (err) {

      setSlots([])

      setSlotShifts([])

      setError(err.message || 'Không lấy được khung giờ.')

    } finally {

      setSlotsLoading(false)

    }

  }, [selectedDate, selectedDoctorId, token])



  useFocusEffect(
    useCallback(() => {
      const doctorId = route.params?.doctorId
      const appointmentDate = route.params?.appointmentDate
      const mode = route.params?.bookingMode
      if (doctorId) setSelectedDoctorId(String(doctorId))
      if (appointmentDate) {
        const key = String(appointmentDate).slice(0, 10)
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) setPrefillDate(key)
      }
      if (mode === 'specialty' || mode === 'date' || mode === 'doctor') {
        setBookingMode(mode)
        if (mode !== 'specialty') setSelectedSpecialtyId('')
      }
      if (mode === 'specialty' || mode === 'date') {
        setHideDoctorPicker(false)
      } else if (mode === 'doctor' && !route.params?.hideDoctorPicker) {
        setHideDoctorPicker(false)
      }
      if (route.params?.hideDoctorPicker) {
        setHideDoctorPicker(true)
      }
      if (doctorId || appointmentDate || mode || route.params?.hideDoctorPicker) {
        navigation.setParams({
          doctorId: undefined,
          appointmentDate: undefined,
          bookingMode: undefined,
          hideDoctorPicker: undefined,
        })
      }
    }, [navigation, route.params?.appointmentDate, route.params?.bookingMode, route.params?.doctorId, route.params?.hideDoctorPicker]),
  )

  useFocusEffect(

    useCallback(() => {

      loadScreen()

    }, [loadScreen]),

  )



  useFocusEffect(

    useCallback(() => {

      loadScheduleDates()

    }, [loadScheduleDates]),

  )



  useFocusEffect(

    useCallback(() => {

      loadSlots()

    }, [loadSlots]),

  )



  const visibleDays = useMemo(() => {

    if (!scheduleDates.length) return days

    const set = new Set(scheduleDates)

    return days.filter((d) => set.has(d.key))

  }, [days, scheduleDates])



  const filteredDoctors = useMemo(() => {

    if (!selectedSpecialtyId) return doctors

    const spec = specialties.find((s) => String(s.id || s._id || '') === selectedSpecialtyId)

    const specName = String(spec?.name || spec?.specialtyName || '').trim().toLowerCase()

    return doctors.filter((d) => {

      const sid = String(d.specialtyID || d.specialtyId || d.specialty_id || '').trim()

      if (sid && sid === selectedSpecialtyId) return true

      if (!specName) return false

      const dn = String(d.specialtyName || d.specialty || '').trim().toLowerCase()

      if (!dn) return false

      return dn === specName || dn.includes(specName) || specName.includes(dn)

    })

  }, [doctors, selectedSpecialtyId, specialties])



  const specialtyChipData = useMemo(() => {

    const rows = specialties

      .map((s) => ({

        id: String(s.id || s._id || ''),

        name: String(s.name || s.specialtyName || '').trim() || '—',

      }))

      .filter((s) => s.id)

    return [{ id: '', name: 'Tất cả' }, ...rows]

  }, [specialties])



  const heroTitleText = useMemo(() => {

    if (hideDoctorPicker && bookingMode === 'doctor') return 'Chọn ngày khám'

    return 'Đăng ký lịch khám'

  }, [hideDoctorPicker, bookingMode])



  const heroSubText = useMemo(() => {

    if (hideDoctorPicker && bookingMode === 'doctor') {

      return 'Chọn ngày còn lịch trống, sau đó chọn khung giờ.'

    }

    if (bookingMode === 'specialty') return 'Chọn chuyên khoa, bác sĩ, ngày và giờ phù hợp'

    if (bookingMode === 'date') return 'Chọn ngày trước, sau đó chọn bác sĩ và giờ'

    return 'Chọn bác sĩ, ngày và giờ phù hợp'

  }, [bookingMode, hideDoctorPicker])



  useEffect(() => {

    const ids = new Set(filteredDoctors.map((d) => d.id))

    if (selectedDoctorId && !ids.has(selectedDoctorId)) {

      setSelectedDoctorId(filteredDoctors[0]?.id || '')

    }

  }, [filteredDoctors, selectedDoctorId])



  async function handleBook() {

    setError('')

    setInfo('')

    if (!selectedDoctorId || !selectedDate || !selectedSlot) {

      setError('Vui lòng chọn bác sĩ, ngày và khung giờ.')

      return

    }

    try {

      const block = await fetchBlockingForNewSlot(token, {

        doctorId: selectedDoctorId,

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

      /* bỏ qua */

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

      const msg = err?.data?.message || err.message || 'Đăng ký lịch thất bại.'
      setError(msg)

    } finally {

      setLoading(false)

    }

  }



  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId)

  function renderSpecialtyChips() {
    return (
      <SectionCard title="Chuyên khoa" hint="Chọn chuyên khoa để lọc bác sĩ">
        <FlatList
          horizontal
          data={specialtyChipData}
          keyExtractor={(item, index) => String(item.id || `all-${index}`)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hRow}
          renderItem={({ item }) => {
            const active = selectedSpecialtyId === item.id
            return (
              <Pressable
                onPress={() => setSelectedSpecialtyId(item.id)}
                style={({ pressed }) => [
                  styles.specialtyChip,
                  active && styles.specialtyChipActive,
                  pressed && styles.specialtyChipPressed,
                ]}
              >
                <Text style={[styles.specialtyChipText, active && styles.specialtyChipTextActive]} numberOfLines={2}>
                  {item.name}
                </Text>
              </Pressable>
            )
          }}
        />
      </SectionCard>
    )
  }

  function renderDoctorSummary() {
    if (!selectedDoctor) return null
    const spec = String(selectedDoctor.specialtyName || selectedDoctor.specialty || '').trim() || '—'
    return (
      <SectionCard title="Bác sĩ" hint="Bạn có thể đổi người khám nếu cần">
        <View style={styles.doctorSummaryRow}>
          <DoctorAvatar doctor={selectedDoctor} size={48} style={styles.doctorSummaryAvatar} />
          <View style={styles.doctorSummaryMeta}>
            <Text style={styles.doctorSummaryName} numberOfLines={2}>
              {getDoctorFullName(selectedDoctor)}
            </Text>
            <Text style={styles.doctorSummarySpec} numberOfLines={2}>
              {spec}
            </Text>
            {formatDoctorPriceVi(selectedDoctor) ? (
              <Text style={styles.doctorSummaryPrice}>{formatDoctorPriceVi(selectedDoctor)}</Text>
            ) : null}
          </View>
          <Pressable onPress={() => navigation.navigate('ChooseDoctor')} hitSlop={8}>
            <Text style={styles.doctorSummaryLink}>Đổi bác sĩ</Text>
          </Pressable>
        </View>
      </SectionCard>
    )
  }

  function renderDoctorSection() {
    return (
      <SectionCard
        title="Bác sĩ"
        hint={bookingMode === 'date' ? 'Chọn bác sĩ phù hợp ngày đã chọn' : 'Vuốt ngang để xem thêm'}
      >
        {!doctors.length ? (
          <Text style={styles.emptyInline}>Chưa có bác sĩ trong hệ thống.</Text>
        ) : !filteredDoctors.length ? (
          <Text style={styles.emptyInline}>Không có bác sĩ cho chuyên khoa này. Chọn chuyên khoa khác.</Text>
        ) : (
          <FlatList
            horizontal
            data={filteredDoctors}
            keyExtractor={(item, index) => String(item.id || item._id || index)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hRow}
            renderItem={({ item }) => {
              const active = item.id === selectedDoctorId
              return (
                <Pressable
                  onPress={async () => {
                    if (!token) return
                    try {
                      const hit = await fetchBlockingPendingForDoctor(token, String(item.id || item._id || ''))
                      if (hit) {
                        Alert.alert('Thông báo', DUPLICATE_PENDING_DOCTOR_MESSAGE)
                        return
                      }
                    } catch {
                      /* bỏ qua */
                    }
                    setSelectedDoctorId(item.id)
                  }}
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
                  {formatDoctorPriceVi(item) ? (
                    <Text style={[styles.doctorPrice, active && styles.doctorPriceActive]} numberOfLines={1}>
                      {formatDoctorPriceVi(item)}
                    </Text>
                  ) : null}
                </Pressable>
              )
            }}
          />
        )}
      </SectionCard>
    )
  }

  function renderDateSection() {
    return (
      <SectionCard
        title="Ngày khám"
        hint={
          datesLoading
            ? 'Đang tải lịch…'
            : selectedDoctor
              ? `Với ${getDoctorFullName(selectedDoctor)}`
              : bookingMode === 'date'
                ? 'Sau đó chọn bác sĩ phù hợp'
                : undefined
        }
      >
        {!datesLoading && scheduleDates.length > 0 && !visibleDays.length ? (
          <Text style={styles.emptyInline}>Bác sĩ không có lịch trong 28 ngày tới.</Text>
        ) : null}
        <FlatList
          horizontal
          data={visibleDays.length ? visibleDays : days}
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
    )
  }



  return (

    <View style={styles.root}>

      <StatusBar barStyle="light-content" backgroundColor={colors.brandBlue} />

      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>

        <View style={styles.heroRow}>

          {navigation.canGoBack() ? (

            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>

              <Ionicons name="chevron-back" size={26} color="#fff" />

            </Pressable>

          ) : (

            <View style={styles.backBtnPlaceholder} />

          )}

          <View style={styles.heroTextWrap}>

            <Text style={styles.heroTitle}>{heroTitleText}</Text>

            <Text style={styles.heroSub}>{heroSubText}</Text>

          </View>

          <Pressable onPress={() => navigation.navigate('MainTabs')} hitSlop={12} style={styles.backBtn} accessibilityLabel="Về trang chủ">

            <Ionicons name="home-outline" size={24} color="#fff" />

          </Pressable>

        </View>

      </View>



      <ScrollView

        style={styles.scroll}

        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 28 }]}

        keyboardShouldPersistTaps="handled"

        showsVerticalScrollIndicator={false}

      >

        <MessageBanner message={info} tone="info" />

        <MessageBanner message={error} />



        {screenLoading ? (

          <View style={styles.screenLoading}>

            <ActivityIndicator color={colors.brandBlue} size="large" />

            <Text style={styles.screenLoadingText}>Đang tải…</Text>

          </View>

        ) : (

          <>

            {bookingMode === 'specialty' ? renderSpecialtyChips() : null}

            {bookingMode === 'date' ? (

              <>

                {renderDateSection()}

                {renderDoctorSection()}

              </>

            ) : hideDoctorPicker && bookingMode === 'doctor' ? (

              <>

                {renderDateSection()}

                {renderDoctorSummary()}

              </>

            ) : (

              <>

                {renderDoctorSection()}

                {renderDateSection()}

              </>

            )}



            <SectionCard title="Khung giờ" hint={slotsLoading || !slots.length ? undefined : `${slots.length} suất trống`}>

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

                  <Text style={styles.slotsEmptySub}>

                    {scheduleDates.length && !scheduleDates.includes(selectedDate)

                      ? 'Bác sĩ không làm việc ngày này. Chọn ngày khác.'

                      : 'Thử chọn ngày khác hoặc bác sĩ khác.'}

                  </Text>

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

              title={loading ? 'Đang đăng ký…' : 'Xác nhận đăng ký lịch khám'}

              onPress={handleBook}

              loading={loading}

              variant="brand"

            />



            <Pressable

              onPress={() => navigation.navigate('MainTabs', { screen: 'MyAppointmentsTab' })}

              style={({ pressed }) => [styles.historyLink, pressed && styles.historyLinkPressed]}

            >

              <Text style={styles.historyLinkText}>Xem lịch sử đặt khám</Text>

            </Pressable>

          </>

        )}

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

  heroTextWrap: {

    flex: 1,

    alignItems: 'center',

    paddingHorizontal: 4,

  },

  heroTitle: {

    color: '#fff',

    fontSize: 17,

    fontWeight: '700',

    textAlign: 'center',

  },

  heroSub: {

    marginTop: 4,

    color: 'rgba(255,255,255,0.88)',

    fontSize: 13,

    textAlign: 'center',

  },

  scroll: {

    flex: 1,

  },

  scrollContent: {

    paddingHorizontal: 16,

    paddingTop: 16,

    gap: 12,

  },

  screenLoading: {

    alignItems: 'center',

    paddingVertical: 48,

    gap: 12,

  },

  screenLoadingText: {

    color: colors.textMuted,

    fontSize: 14,

  },

  sectionCard: {

    backgroundColor: colors.surface,

    borderRadius: 16,

    padding: 16,

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

  doctorPrice: {

    marginTop: 4,

    textAlign: 'center',

    fontSize: 12,

    fontWeight: '800',

    color: colors.primary,

  },

  doctorPriceActive: {

    color: colors.brandBlueDark,

  },

  doctorSummaryRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: 12,

  },

  doctorSummaryAvatar: {

    borderRadius: 12,

  },

  doctorSummaryMeta: {

    flex: 1,

    minWidth: 0,

  },

  doctorSummaryName: {

    fontSize: 15,

    fontWeight: '700',

    color: colors.text,

  },

  doctorSummarySpec: {

    marginTop: 4,

    fontSize: 13,

    color: colors.textMuted,

    lineHeight: 18,

  },

  doctorSummaryPrice: {

    marginTop: 6,

    fontSize: 14,

    fontWeight: '800',

    color: colors.primary,

  },

  doctorSummaryLink: {

    fontSize: 14,

    fontWeight: '700',

    color: colors.brandBlue,

  },

  specialtyChip: {

    maxWidth: 200,

    minHeight: 72,

    justifyContent: 'center',

    borderWidth: 1.5,

    borderColor: colors.border,

    backgroundColor: colors.pageCanvas,

    borderRadius: 14,

    paddingVertical: 10,

    paddingHorizontal: 14,

    marginRight: 10,

  },

  specialtyChipActive: {

    borderColor: colors.brandBlue,

    backgroundColor: colors.brandBlueSoft,

  },

  specialtyChipPressed: {

    opacity: 0.92,

  },

  specialtyChipText: {

    fontSize: 13,

    fontWeight: '600',

    color: colors.text,

    lineHeight: 18,

  },

  specialtyChipTextActive: {

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

  shiftBlocks: {

    gap: 14,

  },

  shiftBlock: {

    gap: 8,

  },

  shiftLabel: {

    fontSize: 13,

    fontWeight: '700',

    color: colors.brandBlueDark,

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

  historyLink: {

    alignItems: 'center',

    paddingVertical: 8,

  },

  historyLinkPressed: {

    opacity: 0.75,

  },

  historyLinkText: {

    color: colors.brandBlue,

    fontSize: 15,

    fontWeight: '600',

  },

})


