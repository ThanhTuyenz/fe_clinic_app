import { useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import {
  completeRegister as completeRegisterApi,
  resendOtp as resendOtpApi,
  startRegister as startRegisterApi,
  verifyEmail as verifyEmailApi,
} from '../api/auth.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import ScreenShell from '../components/ScreenShell.js'
import TextField from '../components/TextField.js'
import { saveSession } from '../lib/session.js'
import { colors } from '../theme/colors.js'

export default function RegisterScreen({ navigation }) {
  const [step, setStep] = useState(1)
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [completeToken, setCompleteToken] = useState('')
  const [emailMask, setEmailMask] = useState('')
  const [otp, setOtp] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)

  function handleChangeEmail() {
    setError('')
    setOtp('')
    setVerificationToken('')
    setCompleteToken('')
    setEmailMask('')
    setEmailVerified(false)
    setStep(1)
  }

  async function handleSendOtp() {
    setError('')
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError('Vui lòng nhập Gmail.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Email không hợp lệ.')
      return
    }
    setLoading(true)
    try {
      setEmailVerified(false)
      setCompleteToken('')
      const data = await startRegisterApi({ email: normalizedEmail })
      setVerificationToken(data.verificationToken || '')
      setEmailMask(data.emailMask || data.email || normalizedEmail)
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
      const data = await verifyEmailApi({ verificationToken, otp: otp.trim() })
      if (data?.token && data?.user) {
        await saveSession({ token: data.token, user: data.user })
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
        return
      }
      if (data?.completeToken) {
        setCompleteToken(data.completeToken)
        if (data.emailMask) setEmailMask(data.emailMask)
        setEmailVerified(true)
        setStep(3)
        return
      }
      setEmailVerified(true)
      setStep(3)
    } catch (err) {
      setError(err.message || 'Xác thực thất bại.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCompleteRegister() {
    setError('')
    if (!emailVerified) {
      setError('Vui lòng xác thực Gmail bằng OTP trước khi tạo mật khẩu.')
      setStep(2)
      return
    }
    if (!lastName.trim() || !firstName.trim() || !phone.trim()) {
      setError('Vui lòng điền đầy đủ họ, tên và số điện thoại.')
      return
    }
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
      const data = await completeRegisterApi({
        completeToken,
        lastName: lastName.trim(),
        firstName: firstName.trim(),
        phone: phone.trim(),
        password,
      })
      if (data?.token && data?.user) {
        await saveSession({ token: data.token, user: data.user })
        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
        return
      }
      navigation.navigate('Login', { message: 'Đăng ký thành công. Vui lòng đăng nhập.' })
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setError('')
    setResendLoading(true)
    try {
      const data = await resendOtpApi({ email: email.trim().toLowerCase() })
      if (data.verificationToken) setVerificationToken(data.verificationToken)
      if (data.emailMask) setEmailMask(data.emailMask)
    } catch (err) {
      setError(err.message || 'Gửi lại mã thất bại.')
    } finally {
      setResendLoading(false)
    }
  }

  const subtitle =
    step === 1
      ? 'Bước 1/3: Nhập email để nhận mã OTP qua hộp thư (kiểm tra cả Spam).'
      : step === 2
        ? `Bước 2/3: Nhập mã OTP đã gửi tới ${emailMask}.`
        : `Bước 3/3: Gmail ${emailMask || email} đã được xác thực.`

  return (
    <ScreenShell
      title={step === 1 ? 'Đăng ký' : step === 2 ? 'Xác thực email' : 'Tạo mật khẩu'}
      subtitle={subtitle}
      footer={
        <>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
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
            editable={!loading}
          />
          <PrimaryButton title={loading ? 'Đang gửi…' : 'Gửi OTP'} onPress={handleSendOtp} loading={loading} />
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
          <PrimaryButton title={loading ? 'Đang xác thực…' : 'Xác nhận OTP'} onPress={handleVerifyOtp} loading={loading} />
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
          <TextField label="Họ" value={lastName} onChangeText={setLastName} placeholder="Nguyễn" editable={!loading} />
          <TextField label="Tên" value={firstName} onChangeText={setFirstName} placeholder="Văn A" editable={!loading} />
          <TextField
            label="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            placeholder="09xx xxx xxx"
            keyboardType="phone-pad"
            editable={!loading}
          />
          <TextField
            label="Mật khẩu"
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
          <PrimaryButton title={loading ? 'Đang xử lý…' : 'Tạo tài khoản'} onPress={handleCompleteRegister} loading={loading} />
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
