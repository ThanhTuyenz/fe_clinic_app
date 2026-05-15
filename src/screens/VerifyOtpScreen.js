import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { resendOtp as resendOtpApi, verifyEmail as verifyEmailApi } from '../api/auth.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import ScreenShell from '../components/ScreenShell.js'
import TextField from '../components/TextField.js'
import { saveSession } from '../lib/session.js'
import { colors } from '../theme/colors.js'

export default function VerifyOtpScreen({ navigation, route }) {
  const params = route.params || {}
  const [verificationToken, setVerificationToken] = useState(params.verificationToken || '')
  const [email] = useState(params.email || '')
  const [emailMask, setEmailMask] = useState(params.emailMask || '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  useEffect(() => {
    if (!params.verificationToken || !params.email) {
      navigation.replace('Login')
    }
  }, [navigation, params.email, params.verificationToken])

  async function handleVerifyOtp() {
    setError('')
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Vui lòng nhập đúng mã 6 chữ số.')
      return
    }
    setLoading(true)
    try {
      const data = await verifyEmailApi({ verificationToken, otp: otp.trim() })
      await saveSession({ token: data.token, user: data.user })
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
    } catch (err) {
      setError(err.message || 'Xác thực thất bại.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setResendLoading(true)
    try {
      const data = await resendOtpApi({ email })
      if (data.verificationToken) setVerificationToken(data.verificationToken)
      if (data.emailMask) setEmailMask(data.emailMask)
    } catch (err) {
      setError(err.message || 'Gửi lại mã thất bại.')
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <ScreenShell
      title="Nhập mã OTP"
      subtitle={`Mã đã gửi tới ${emailMask || email}. Sau khi xác thực, bạn sẽ được đăng nhập.`}
      footer={
        <Pressable onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Quay lại đăng nhập</Text>
        </Pressable>
      }
    >
      <MessageBanner message={error} />
      <TextField
        label="Mã OTP"
        value={otp}
        onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        keyboardType="number-pad"
        editable={!loading}
      />
      <PrimaryButton title={loading ? 'Đang xác thực…' : 'Xác nhận & đăng nhập'} onPress={handleVerifyOtp} loading={loading} />
      <Pressable onPress={handleResend} disabled={resendLoading || loading}>
        <Text style={styles.inlineAction}>{resendLoading ? 'Đang gửi…' : 'Gửi lại mã OTP'}</Text>
      </Pressable>
    </ScreenShell>
  )
}

const styles = StyleSheet.create({
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
  inlineAction: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
})
