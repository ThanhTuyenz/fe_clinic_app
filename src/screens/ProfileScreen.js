import { useCallback, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import ScreenShell from '../components/ScreenShell.js'
import { clearSession, getSession } from '../lib/session.js'
import { getUserDisplayName, getUserInitials, resolvePatientCode } from '../lib/user.js'
import { colors } from '../theme/colors.js'

export default function ProfileScreen({ navigation }) {
  const [session, setSession] = useState({ token: '', user: null })

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
  const patientCode = resolvePatientCode(session.user)

  return (
    <ScreenShell title="Tôi" subtitle={session.token ? 'Quản lý tài khoản bệnh nhân.' : 'Đăng nhập để dùng đầy đủ tính năng.'}>
      {session.token ? (
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getUserInitials(session.user)}</Text>
          </View>
          <View style={styles.headerBody}>
            <Text style={styles.headerName} numberOfLines={1}>
              {displayName || 'Bệnh nhân'}
            </Text>
            <Text style={styles.headerMeta} numberOfLines={1}>
              Mã BN · {patientCode}
            </Text>
          </View>
        </View>
      ) : null}

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
    </ScreenShell>
  )
}

function MenuRow({ title, onPress, danger, showChevron = true }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
      android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
    >
      <Text style={[styles.menuTitle, danger && styles.menuTitleDanger]}>{title}</Text>
      {showChevron ? <Text style={styles.chevron}>›</Text> : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.infoBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 17,
  },
  headerBody: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerMeta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textMuted,
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
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
})
