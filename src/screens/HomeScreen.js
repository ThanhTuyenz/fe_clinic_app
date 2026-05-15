import { useCallback, useMemo, useState } from 'react'
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { listDepartments } from '../api/departments.js'
import { listDoctors } from '../api/doctors.js'
import DoctorAvatar from '../components/DoctorAvatar.js'
import ScreenShell from '../components/ScreenShell.js'
import { clearSession, getSession } from '../lib/session.js'
import { getDoctorFullName, getUserDisplayName, getUserInitials, resolvePatientCode } from '../lib/user.js'
import { colors } from '../theme/colors.js'

const DEPT_CARD_W = 200
const DOCTOR_CARD_W = 168

function firstName(displayName) {
  if (!displayName || typeof displayName !== 'string') return ''
  return displayName.trim().split(/\s+/)[0] || ''
}

export default function HomeScreen({ navigation }) {
  const [session, setSession] = useState({ token: '', user: null })
  const [departments, setDepartments] = useState([])
  const [doctors, setDoctors] = useState([])
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    setError('')
    const nextSession = await getSession()
    setSession(nextSession)
    try {
      const [deptRows, doctorRows] = await Promise.all([listDepartments(), listDoctors()])
      setDepartments(deptRows.slice(0, 8))
      setDoctors(doctorRows.slice(0, 8))
    } catch (err) {
      setError(err.message || 'Không tải được dữ liệu phòng khám.')
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData]),
  )

  async function handleLogout() {
    await clearSession()
    setSession({ token: '', user: null })
  }

  const displayName = getUserDisplayName(session.user)
  const patientCode = resolvePatientCode(session.user)
  const namePart = firstName(displayName)

  const quickTiles = useMemo(
    () => [
      {
        key: 'book',
        label: 'Đặt lịch',
        hint: 'Chọn bác sĩ & giờ',
        icon: '📅',
        onPress: () => navigation.navigate('Appointment'),
      },
      {
        key: 'mine',
        label: 'Lịch của tôi',
        hint: 'Theo dõi hẹn',
        icon: '🗓️',
        onPress: () => navigation.navigate('MyAppointmentsTab'),
      },
      {
        key: 'ai',
        label: 'Trợ lý AI',
        hint: 'Hỏi đáp nhanh',
        icon: '💬',
        onPress: () => navigation.navigate('AIChatTab'),
      },
      {
        key: 'dept',
        label: 'Khoa khám',
        hint: `${departments.length || '…'} khoa`,
        icon: '🏥',
        onPress: () => navigation.navigate('Appointment'),
      },
    ],
    [navigation, departments.length],
  )

  return (
    <ScreenShell title={null} subtitle={null}>
      <View style={styles.topRow}>
        <View style={styles.topRowText}>
          <Text style={styles.brand}>VitaCare</Text>
          <Text style={styles.greeting}>
            {session.token ? (namePart ? `Xin chào, ${namePart}` : 'Xin chào') : 'Xin chào'}
          </Text>
          <Text style={styles.greetingSub}>
            {session.token ? 'Chúc bạn một ngày khỏe mạnh.' : 'Đăng nhập để quản lý lịch khám dễ dàng hơn.'}
          </Text>
        </View>
        <Image source={require('../../assets/logo.png')} style={styles.topLogo} resizeMode="contain" />
      </View>

      {session.token ? (
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitials(session.user)}</Text>
          </View>
          <View style={styles.profileBody}>
            <Text style={styles.profileName} numberOfLines={1}>
              {displayName || 'Bệnh nhân'}
            </Text>
            <Text style={styles.profileMeta} numberOfLines={1}>
              Mã BN · {patientCode}
            </Text>
          </View>
          <Pressable
            onPress={handleLogout}
            hitSlop={12}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutPressed]}
          >
            <Text style={styles.logout}>Đăng xuất</Text>
          </Pressable>
        </View>
      ) : (
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
      )}

      <Pressable
        style={({ pressed }) => [styles.heroBanner, pressed && styles.heroPressed]}
        onPress={() => navigation.navigate('Appointment')}
      >
        <Text style={styles.heroEyebrow}>Đặt lịch trực tuyến</Text>
        <Text style={styles.heroTitle}>Lịch khám trong vài bước</Text>
        <Text style={styles.heroText}>Chọn khoa, bác sĩ và giờ phù hợp — xác nhận ngay trên điện thoại.</Text>
        <View style={styles.heroCta}>
          <Text style={styles.heroCtaText}>Đặt lịch ngay</Text>
          <Text style={styles.heroCtaArrow}>→</Text>
        </View>
      </Pressable>

      <Text style={styles.sectionHeading}>Tiện ích</Text>
      <View style={styles.tileGrid}>
        {quickTiles.map((tile) => (
          <Pressable
            key={tile.key}
            style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
            onPress={tile.onPress}
          >
            <Text style={styles.tileIcon}>{tile.icon}</Text>
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

      {departments.length ? (
        <View style={styles.carouselBlock}>
          <View style={styles.carouselHead}>
            <Text style={styles.sectionHeading}>Khoa khám</Text>
            <Text style={styles.sectionMeta}>{departments.length} khoa</Text>
          </View>
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
                key={`dept-${index}-${dept.id ?? dept._id ?? dept.name ?? 'row'}`}
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
        </View>
      ) : null}

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
                onPress={() => navigation.navigate('Appointment')}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 12,
  },
  topRowText: {
    flex: 1,
    minWidth: 0,
  },
  brand: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.4,
    lineHeight: 30,
  },
  greetingSub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  topLogo: {
    width: 52,
    height: 52,
    marginTop: 4,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadowCard,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 16,
  },
  profileBody: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  profileMeta: {
    color: colors.textMuted,
    marginTop: 3,
    fontSize: 13,
  },
  logoutBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  logoutPressed: {
    opacity: 0.7,
  },
  logout: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
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
  heroBanner: {
    borderRadius: 22,
    padding: 20,
    backgroundColor: colors.primary,
    marginBottom: 22,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  heroPressed: {
    opacity: 0.94,
  },
  heroEyebrow: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  heroCtaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  heroCtaArrow: {
    color: '#fff',
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
  tileIcon: {
    fontSize: 26,
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
})
