import { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { getMe, updateMe } from '../api/auth.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import ScreenShell from '../components/ScreenShell.js'
import TextField from '../components/TextField.js'
import { getSession, saveSession } from '../lib/session.js'
import { getUserEmail } from '../lib/user.js'
import { colors } from '../theme/colors.js'

export default function PersonalInfoScreen({ navigation }) {
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [booting, setBooting] = useState(true)
  const [saving, setSaving] = useState(false)
  const [token, setToken] = useState('')

  const load = useCallback(async () => {
    setError('')
    setInfo('')
    const s = await getSession()
    setToken(s.token || '')
    if (!s.token) {
      navigation.navigate('Login')
      return
    }
    setBooting(true)
    try {
      const data = await getMe({ token: s.token })
      const u = data?.user || data
      setLastName(String(u?.lastName || '').trim())
      setFirstName(String(u?.firstName || '').trim())
      setPhone(String(u?.phone || '').trim())
      setEmail(getUserEmail(u) || String(u?.email || '').trim())
    } catch (err) {
      setError(err.message || 'Không tải được thông tin.')
    } finally {
      setBooting(false)
    }
  }, [navigation])

  useFocusEffect(
    useCallback(() => {
      load()
    }, [load]),
  )

  async function handleSave() {
    setError('')
    setInfo('')
    if (!token) {
      navigation.navigate('Login')
      return
    }
    setSaving(true)
    try {
      const data = await updateMe({
        token,
        payload: {
          lastName: lastName.trim(),
          firstName: firstName.trim(),
          phone: phone.trim(),
        },
      })
      const u = data?.user || data
      if (u && typeof u === 'object') {
        await saveSession({ token, user: u })
      }
      setInfo('Đã cập nhật thông tin.')
    } catch (err) {
      setError(err.message || 'Lưu thất bại.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScreenShell title="Thông tin cá nhân" subtitle="Cập nhật họ tên và số điện thoại liên hệ.">
      <MessageBanner message={info} tone="info" />
      <MessageBanner message={error} />
      <View style={styles.readonlyBlock}>
        <Text style={styles.readonlyLabel}>Email</Text>
        <Text style={styles.readonlyValue}>{email || '—'}</Text>
      </View>
      <TextField
        label="Họ"
        value={lastName}
        onChangeText={setLastName}
        placeholder="vd: Nguyễn"
        editable={!saving && !booting}
        autoCapitalize="words"
      />
      <TextField
        label="Tên"
        value={firstName}
        onChangeText={setFirstName}
        placeholder="vd: Văn A"
        editable={!saving && !booting}
        autoCapitalize="words"
      />
      <TextField
        label="Số điện thoại"
        value={phone}
        onChangeText={setPhone}
        placeholder="vd: 0901234567"
        keyboardType="phone-pad"
        editable={!saving && !booting}
      />
      <PrimaryButton title={saving ? 'Đang xử lý…' : 'Lưu thay đổi'} onPress={handleSave} loading={saving} disabled={booting} />
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  readonlyBlock: {
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readonlyLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
  },
  readonlyValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
})
