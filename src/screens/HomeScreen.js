import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { listDepartments } from '../api/departments.js'
import { listDoctors } from '../api/doctors.js'
import DoctorAvatar from '../components/DoctorAvatar.js'
import ScreenShell from '../components/ScreenShell.js'
import { DUPLICATE_PENDING_DOCTOR_MESSAGE, fetchBlockingPendingForDoctor } from '../lib/bookingConstraints.js'
import { getSession } from '../lib/session.js'
import { formatDoctorPriceVi } from '../lib/doctorProfileUi.js'
import { getDoctorFullName } from '../lib/user.js'
import { colors } from '../theme/colors.js'

const DEPT_CARD_W = 200
const DOCTOR_CARD_W = 168

export default function HomeScreen({ navigation }) {
  const [session, setSession] = useState({ token: '', user: null })
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [bookModalOpen, setBookModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [deptError, setDeptError] = useState('')
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const loadData = useCallback(async () => {
    setError('')
    setDeptError('')
    const nextSession = await getSession()
    setSession(nextSession)

    setDepartmentsLoading(true)
    const deptPromise = listDepartments()
      .then((rows) => {
        setDepartments(Array.isArray(rows) ? rows : [])
      })
      .catch((err) => {
        setDepartments([])
        setDeptError(err.message || 'Không tải được danh sách khoa.')
      })
      .finally(() => {
        setDepartmentsLoading(false)
      })

    try {
      const doctorRows = await listDoctors()
      setDoctors(Array.isArray(doctorRows) ? doctorRows.slice(0, 8) : [])
    } catch (err) {
      setDoctors([])
      setError(err.message || 'Không tải được danh sách bác sĩ.')
    }

    await deptPromise
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData]),
  )

  const quickTiles = useMemo(
    () => [
      {
        key: 'book',
        label: 'Đặt lịch',
        hint: 'Chọn hình thức đặt lịch',
        iconName: 'calendar-outline',
        onPress: () => setBookModalOpen(true),
      },
      {
        key: 'mine',
        label: 'Lịch sử đặt khám',
        hint: 'Theo dõi hẹn',
        iconName: 'receipt-outline',
        onPress: () => navigation.navigate('MyAppointmentsTab'),
      },
      {
        key: 'ai',
        label: 'Trợ lý AI',
        hint: 'Hỏi đáp nhanh',
        iconName: 'chatbubble-ellipses-outline',
        onPress: () => navigation.navigate('AIChatTab'),
      },
      {
        key: 'dept',
        label: 'Khoa khám',
        hint: departmentsLoading
          ? 'Đang tải danh sách…'
          : departments.length
            ? `${departments.length} khoa · chọn chuyên khoa để đặt lịch`
            : 'Chưa có dữ liệu khoa',
        iconName: 'medkit-outline',
        onPress: () => navigation.navigate('ChooseSpecialty'),
      },
    ],
    [navigation, departments.length, departmentsLoading],
  )

  return (
    <ScreenShell title={null} subtitle={null}>
      <View style={styles.topHeader}>
        <Image source={require('../../assets/logo.png')} style={styles.topLogo} resizeMode="contain" />
        <View style={styles.topHeaderText}>
          <Text style={styles.brand}>VitaCare</Text>
          <Text style={styles.greetingSub}>
            {session.token ? 'Chúc bạn một ngày khỏe mạnh.' : 'Đăng nhập để quản lý lịch khám dễ dàng hơn.'}
          </Text>
        </View>
      </View>

      {!session.token ? (
        <View style={styles.authRow}>
          <Pressable
            style={({ pressed }) => [styles.authPrimary, pressed && styles.authPressed]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.authPrimaryLabel}>Đăng nhập</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.authGhost, pressed && styles.authPressed]}
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={styles.authGhostLabel}>Đăng ký</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal visible={bookModalOpen} animationType="fade" transparent onRequestClose={() => setBookModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setBookModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Đặt lịch khám</Text>
            <Text style={styles.modalDesc}>Chọn cách bạn muốn tìm lịch phù hợp.</Text>
            <Pressable
              style={({ pressed }) => [styles.modalOption, pressed && styles.modalOptionPressed]}
              onPress={() => {
                setBookModalOpen(false)
                navigation.navigate('ChooseSpecialty')
              }}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons name="fitness-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionLabel}>Khám theo chuyên khoa</Text>
                <Text style={styles.modalOptionHint}>Chọn chuyên khoa theo bệnh lý</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalOption, pressed && styles.modalOptionPressed]}
              onPress={() => {
                setBookModalOpen(false)
                navigation.navigate('ChooseAppointmentDate', { dateFirst: true })
              }}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons name="calendar-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionLabel}>Khám theo ngày</Text>
                <Text style={styles.modalOptionHint}>Chọn ngày khám mong muốn</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.modalOption, pressed && styles.modalOptionPressed]}
              onPress={() => {
                setBookModalOpen(false)
                navigation.navigate('ChooseDoctor')
              }}
            >
              <View style={styles.modalOptionIcon}>
                <Ionicons name="person-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={styles.modalOptionLabel}>Khám theo bác sĩ</Text>
                <Text style={styles.modalOptionHint}>Chọn bác sĩ mong muốn</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable style={styles.modalCloseBtn} onPress={() => setBookModalOpen(false)}>
              <Text style={styles.modalCloseLabel}>Đóng</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Text style={styles.sectionHeading}>Tiện ích</Text>
      <View style={styles.tileGrid}>
        {quickTiles.map((tile) => (
          <Pressable
            key={tile.key}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={tile.onPress}
          >
            <View style={styles.tileIconWrap}>
              <Ionicons name={tile.iconName} size={24} color={colors.primary} />
            </View>
            <Text style={styles.tileLabel}>{tile.label}</Text>
            <Text style={styles.tileHint}>{tile.hint}</Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      {deptError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.error}>{deptError}</Text>
        </View>
      ) : null}

      <View style={styles.carouselBlock}>
        <View style={styles.carouselHead}>
          <Text style={styles.sectionHeading}>Khoa khám</Text>
          <Text style={styles.sectionMeta}>
            {departmentsLoading ? 'Đang tải…' : `${departments.length} khoa`}
          </Text>
        </View>
        {departmentsLoading ? (
          <View style={styles.deptLoadingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.deptLoadingText}>Đang tải danh sách khoa…</Text>
          </View>
        ) : departments.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            decelerationRate="fast"
            snapToInterval={DEPT_CARD_W + 10}
            snapToAlignment="start"
          >
            {departments.map((dept, index) => (
              <View
                key={`dept-${String(dept.id)}-${index}`}
                style={[styles.deptCard, { width: DEPT_CARD_W }]}
              >
                <View style={styles.deptBadge}>
                  <Text style={styles.deptBadgeText}>Khoa</Text>
                </View>
                <Text style={styles.deptName} numberOfLines={2}>
                  {dept.name}
                </Text>
                {dept.description ? (
                  <Text style={styles.deptDesc} numberOfLines={3}>
                    {dept.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.deptEmpty}>Chưa có dữ liệu khoa khám.</Text>
        )}
      </View>

      {doctors.length ? (
        <View style={styles.carouselBlock}>
          <View style={styles.carouselHead}>
            <Text style={styles.sectionHeading}>Bác sĩ</Text>
            <Text style={styles.sectionMeta}>Gợi ý cho bạn</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            decelerationRate="fast"
            snapToInterval={DOCTOR_CARD_W + 10}
            snapToAlignment="start"
          >
            {doctors.map((doctor, index) => (
              <Pressable
                key={`doctor-${index}-${doctor.id ?? doctor._id ?? 'row'}`}
                style={({ pressed }) => [
                  styles.doctorCard,
                  { width: DOCTOR_CARD_W },
                  pressed && styles.tilePressed,
                ]}
                onPress={async () => {
                  const nextSession = await getSession()
                  if (!nextSession.token) {
                    navigation.navigate('Login', { message: 'Vui lòng đăng nhập để đặt lịch khám.' })
                    return
                  }
                  const did = String(doctor.id || doctor._id || '').trim()
                  try {
                    const hit = did ? await fetchBlockingPendingForDoctor(nextSession.token, did) : null
                    if (hit) {
                      Alert.alert('Thông báo', DUPLICATE_PENDING_DOCTOR_MESSAGE)
                      return
                    }
                  } catch {
                    /* bỏ qua, cho phép vào màn đặt lịch */
                  }
                  navigation.navigate('ChooseAppointmentDate', {
                    doctorId: did,
                    doctor,
                  })
                }}
              >
                <DoctorAvatar doctor={doctor} size={44} style={styles.doctorAvatarImg} />
                <Text style={styles.doctorName} numberOfLines={2}>
                  {getDoctorFullName(doctor)}
                </Text>
                {doctor.specialty ? (
                  <Text style={styles.doctorSpec} numberOfLines={2}>
                    {doctor.specialty}
                  </Text>
                ) : null}
                {formatDoctorPriceVi(doctor) ? (
                  <Text style={styles.doctorPrice}>{formatDoctorPriceVi(doctor)}</Text>
                ) : null}
                <Text style={styles.doctorLink}>Đặt lịch</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={{ height: 8 }} />
    </ScreenShell>
  )
}

const shadowCard = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
  },
  android: { elevation: 4 },
  default: {},
})

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  modalDesc: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalOptionPressed: {
    opacity: 0.85,
  },
  modalOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionText: {
    flex: 1,
    minWidth: 0,
  },
  modalOptionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalOptionHint: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  modalCloseBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  modalCloseLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 14,
  },
  topHeaderText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  greetingSub: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  topLogo: {
    width: 80,
    height: 80,
    flexShrink: 0,
  },
  authRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  authPrimary: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  authGhost: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 50,
  },
  authPressed: {
    opacity: 0.88,
  },
  authPrimaryLabel: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  authGhostLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  sectionMeta: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  carouselHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  carouselBlock: {
    marginBottom: 22,
  },
  carouselContent: {
    paddingRight: 20,
    gap: 10,
    paddingVertical: 2,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  tile: {
    width: '48%',
    flexGrow: 1,
    minWidth: '47%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowCard,
  },
  tilePressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  tileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tileLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  tileHint: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  deptCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
    ...shadowCard,
  },
  deptBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.infoBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
    textTransform: 'uppercase',
  },
  deptName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 21,
  },
  deptDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  doctorCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 10,
    ...shadowCard,
  },
  doctorAvatarImg: {
    marginBottom: 10,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 20,
    minHeight: 40,
  },
  doctorSpec: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
    minHeight: 32,
  },
  doctorPrice: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  doctorLink: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  errorBanner: {
    backgroundColor: colors.dangerBg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  deptLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    paddingHorizontal: 4,
  },
  deptLoadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  deptEmpty: {
    fontSize: 14,
    color: colors.textMuted,
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
})
