import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import {
  resendForgotPasswordOtp as resendForgotPasswordOtpApi,
  resetPasswordWithToken as resetPasswordWithTokenApi,
  startForgotPassword as startForgotPasswordApi,
  verifyForgotPasswordOtp as verifyForgotPasswordOtpApi,
} from '../api/auth.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import ScreenShell from '../components/ScreenShell.js'
import TextField from '../components/TextField.js'
import { colors } from '../theme/colors.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1)
  const [email, setEmail] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [emailMask, setEmailMask] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  function handleChangeEmail() {
    setError('')
    setOtp('')
    setVerificationToken('')
    setResetToken('')
    setEmailMask('')
    setPassword('')
    setConfirm('')
    setStep(1)
  }

  async function handleRequestOtp() {
    setError('')
    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      setError('Vui lòng nhập email đã đăng ký.')
      return
    }
    if (!EMAIL_RE.test(normalized)) {
      setError('Email không hợp lệ.')
      return
    }
    setLoading(true)
    try {
      const data = await startForgotPasswordApi({ email: normalized })
      setVerificationToken(data.verificationToken || '')
      setEmailMask(data.emailMask || '')
      setOtp('')
      setStep(2)
    } catch (err) {
      setError(err?.message || 'Gửi OTP thất bại.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp() {
    setError('')
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Vui lòng nhập đúng mã 6 chữ số.')
      return
    }
    setLoading(true)
    try {
      const data = await verifyForgotPasswordOtpApi({ verificationToken, otp: otp.trim() })
      setResetToken(data.resetToken || '')
      if (data.emailMask) setEmailMask(data.emailMask)
      setStep(3)
    } catch (err) {
      setError(err.message || 'Xác thực thất bại.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    const normalized = email.trim().toLowerCase()
    if (!EMAIL_RE.test(normalized)) {
      setError('Email không hợp lệ. Hãy quay lại bước 1.')
      return
    }
    setResendLoading(true)
    try {
      const data = await resendForgotPasswordOtpApi({ email: normalized })
      if (data.verificationToken) setVerificationToken(data.verificationToken)
      if (data.emailMask) setEmailMask(data.emailMask)
    } catch (err) {
      setError(err.message || 'Gửi lại mã thất bại.')
    } finally {
      setResendLoading(false)
    }
  }

  async function handleResetPassword() {
    setError('')
    if (password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.')
      return
    }
    if (password !== confirm) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }
    setLoading(true)
    try {
      await resetPasswordWithTokenApi({ resetToken, newPassword: password })
      navigation.reset({
        index: 0,
        routes: [
          {
            name: 'Login',
            params: { message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.' },
          },
        ],
      })
    } catch (err) {
      setError(err.message || 'Đặt lại mật khẩu thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const subtitle =
    step === 1
      ? 'Bước 1/3: Nhập email đã đăng ký tài khoản bệnh nhân. Chỉ khi email có trong hệ thống thì mã OTP mới được gửi tới hộp thư (kiểm tra cả Spam).'
      : step === 2
        ? `Bước 2/3: Nhập mã 6 số vừa gửi tới ${emailMask || 'email của bạn'}.`
        : `Bước 3/3: Đặt mật khẩu mới (${emailMask || 'đã xác thực'}).`

  return (
    <ScreenShell
      title={step === 1 ? 'Quên mật khẩu' : step === 2 ? 'Xác thực OTP' : 'Mật khẩu mới'}
      subtitle={subtitle}
      footer={
        <>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Quay lại đăng nhập</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('MainTabs')}>
            <Text style={styles.mutedLink}>Về trang chủ</Text>
          </Pressable>
        </>
      }
    >
      <MessageBanner message={error} />
      {step === 1 ? (
        <>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="vd: yourname@gmail.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
          <PrimaryButton title={loading ? 'Đang gửi…' : 'Gửi mã OTP'} onPress={handleRequestOtp} loading={loading} />
        </>
      ) : null}
      {step === 2 ? (
        <>
          <TextField
            label="Mã OTP"
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            keyboardType="number-pad"
            editable={!loading}
          />
          <PrimaryButton title={loading ? 'Đang xác thực…' : 'Tiếp tục'} onPress={handleVerifyOtp} loading={loading} />
          <Pressable onPress={handleChangeEmail} disabled={loading}>
            <Text style={styles.inlineAction}>Đổi email</Text>
          </Pressable>
          <Pressable onPress={handleResend} disabled={resendLoading || loading}>
            <Text style={styles.inlineAction}>{resendLoading ? 'Đang gửi…' : 'Gửi lại mã OTP'}</Text>
          </Pressable>
        </>
      ) : null}
      {step === 3 ? (
        <>
          <TextField
            label="Mật khẩu mới"
            value={password}
            onChangeText={setPassword}
            placeholder="Ít nhất 6 ký tự"
            secureTextEntry
            editable={!loading}
          />
          <TextField
            label="Xác nhận mật khẩu"
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Nhập lại mật khẩu"
            secureTextEntry
            editable={!loading}
          />
          <PrimaryButton title={loading ? 'Đang lưu…' : 'Đặt lại mật khẩu'} onPress={handleResetPassword} loading={loading} />
        </>
      ) : null}
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
  inlineAction: {
    color: colors.primary,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
})
