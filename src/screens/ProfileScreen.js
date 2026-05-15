import { useCallback, useMemo, useState } from 'react'
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import QRCode from 'react-native-qrcode-svg'
import { clearSession, getSession } from '../lib/session.js'
import { getUserDisplayName, resolvePatientCode } from '../lib/user.js'
import { colors } from '../theme/colors.js'

const HERO_BLUE = '#1d4ed8'

function HeroDecor() {
  const items = [
    { top: 8, left: 12, size: 32, opacity: 0.14 },
    { top: 36, left: 44, size: 44, opacity: 0.1 },
    { top: 18, left: 88, size: 26, opacity: 0.12 },
    { top: 52, left: 8, size: 22, opacity: 0.08 },
    { top: 64, left: 120, size: 36, opacity: 0.09 },
  ]
  return (
    <View style={styles.decorLayer} pointerEvents="none">
      {items.map((c, i) => (
        <Ionicons
          key={String(i)}
          name="medical"
          size={c.size}
          color="#ffffff"
          style={{ position: 'absolute', top: c.top, left: c.left, opacity: c.opacity }}
        />
      ))}
    </View>
  )
}

export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const [session, setSession] = useState({ token: '', user: null })
  const [qrVisible, setQrVisible] = useState(false)

  const loadSession = useCallback(async () => {
    setSession(await getSession())
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadSession()
    }, [loadSession]),
  )

  function goStack(name) {
    const root = navigation.getParent()
    if (root) root.navigate(name)
    else navigation.navigate(name)
  }

  async function handleLogout() {
    await clearSession()
    setSession({ token: '', user: null })
    const root = navigation.getParent()
    if (root) {
      root.reset({ index: 0, routes: [{ name: 'Login' }] })
    } else {
      navigation.navigate('Login')
    }
  }

  const displayName = getUserDisplayName(session.user)
  const heroName = session.token ? displayName || 'Bệnh nhân' : 'Tài khoản'
  const patientCode = useMemo(
    () => (session.token && session.user ? resolvePatientCode(session.user) : ''),
    [session.token, session.user],
  )
  const qrPayload = useMemo(() => {
    if (!patientCode) return ''
    return JSON.stringify({ type: 'patient', code: patientCode, v: 1 })
  }, [patientCode])

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 10 }]}>
          <HeroDecor />
          <View style={styles.heroTopRow}>
            <Pressable
              onPress={() => navigation.navigate('HomeTab')}
              hitSlop={12}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Về trang chủ"
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <View style={styles.heroTopRight}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.heroLogoSmall}
                resizeMode="contain"
              />
              {session.token ? (
                <Pressable
                  onPress={() => setQrVisible(true)}
                  hitSlop={10}
                  style={({ pressed }) => [styles.qrTopBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Mã QR mã bệnh nhân"
                >
                  <Ionicons name="qr-code-outline" size={26} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.heroCenter}>
            <View style={styles.logoRing}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.logoInner}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.heroName} numberOfLines={2}>
              {heroName}
            </Text>
            {!session.token ? <Text style={styles.heroMeta}>Đăng nhập để xem hồ sơ đầy đủ</Text> : null}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.menuCard}>
            <MenuRow
              title="Thông tin cá nhân"
              onPress={() => (session.token ? goStack('PersonalInfo') : goStack('Login'))}
            />
            <View style={styles.separator} />
            <MenuRow
              title="Đổi mật khẩu"
              onPress={() => (session.token ? goStack('ChangePassword') : goStack('Login'))}
            />
            <View style={styles.separator} />
            <MenuRow
              title={session.token ? 'Đăng xuất' : 'Đăng nhập'}
              danger={!!session.token}
              showChevron={!session.token}
              onPress={session.token ? handleLogout : () => goStack('Login')}
            />
          </View>
        </View>
      </ScrollView>

      <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => setQrVisible(false)}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setQrVisible(false)} />
          <View style={[styles.modalCard, { marginBottom: insets.bottom + 16 }]}>
            <Text style={styles.modalTitle}>Mã bệnh nhân</Text>
            <Text style={styles.modalCode}>{patientCode || '—'}</Text>
            <Text style={styles.modalHint}>Đưa mã QR này khi đến quầy để tra cứu nhanh.</Text>
            {qrPayload ? (
              <View style={styles.qrBox}>
                <QRCode value={qrPayload} size={216} color={colors.text} backgroundColor="#fff" />
              </View>
            ) : null}
            <Pressable style={({ pressed }) => [styles.modalBtn, pressed && styles.pressed]} onPress={() => setQrVisible(false)}>
              <Text style={styles.modalBtnText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

function MenuRow({ title, onPress, danger, showChevron = true, iconLeft }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
    >
      <View style={styles.menuRowInner}>
        {iconLeft ? <Ionicons name={iconLeft} size={22} color={colors.primary} style={styles.menuIconLeft} /> : null}
        <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
      </View>
      {showChevron ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    backgroundColor: HERO_BLUE,
    paddingBottom: 28,
    overflow: 'hidden',
  },
  decorLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
    zIndex: 1,
  },
  heroTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qrTopBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginLeft: 4,
  },
  iconBtn: {
    padding: 4,
  },
  pressed: {
    opacity: 0.75,
  },
  heroLogoSmall: {
    width: 40,
    height: 40,
    opacity: 0.92,
  },
  heroCenter: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 4,
    zIndex: 1,
  },
  logoRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  logoInner: {
    width: 72,
    height: 72,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  heroMeta: {
    marginTop: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  menuRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  menuIconLeft: {
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
  },
  menuTitleDanger: {
    color: colors.danger,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: '300',
    marginLeft: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 16,
  },
  rowPressed: {
    opacity: 0.85,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  modalCard: {
    width: '88%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    zIndex: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modalCode: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  qrBox: {
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 18,
  },
  modalBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
})
