import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { login as loginApi } from '../api/auth.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import ScreenShell from '../components/ScreenShell.js'
import TextField from '../components/TextField.js'
import { saveSession } from '../lib/session.js'
import { colors } from '../theme/colors.js'

export default function LoginScreen({ navigation, route }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState(route.params?.message || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setInfo('')
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email/số điện thoại và mật khẩu.')
      return
    }
    setLoading(true)
    try {
      const data = await loginApi({ email: email.trim(), password })
      const userType = String(data?.user?.userType || '').toLowerCase()
      const role = String(data?.user?.role || '').toLowerCase()
      const isPatient = userType === 'patient' || role === 'patient'
      if (!isPatient) {
        throw new Error('Chỉ bệnh nhân mới được phép đăng nhập tại ứng dụng này.')
      }
      await saveSession({ token: data.token, user: data.user })
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED' && err.verificationToken && err.email) {
        navigation.navigate('VerifyOtp', {
          verificationToken: err.verificationToken,
          email: err.email,
          emailMask: err.emailMask,
        })
        return
      }
      setError(err.message || 'Đăng nhập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell
      title="Đăng nhập"
      subtitle="Nhập thông tin tài khoản bệnh nhân VitaCare Clinic."
      footer={
        <>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Chưa có tài khoản? Đăng ký</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('MainTabs')}>
            <Text style={styles.mutedLink}>Về trang chủ</Text>
          </Pressable>
        </>
      }
    >
      <MessageBanner message={info} tone="info" />
      <MessageBanner message={error} />
      <TextField
        label="Email hoặc số điện thoại"
        value={email}
        onChangeText={setEmail}
        placeholder="vd: user@email.com"
        editable={!loading}
      />
      <TextField
        label="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        editable={!loading}
      />
      <PrimaryButton title={loading ? 'Đang xử lý…' : 'Đăng nhập'} onPress={handleSubmit} loading={loading} />
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  link: {
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 10,
  },
  mutedLink: {
    color: colors.textMuted,
  },
})
