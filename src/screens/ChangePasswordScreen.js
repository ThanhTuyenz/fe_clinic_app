import { useState } from 'react'
import { changePassword as changePasswordApi } from '../api/auth.js'
import MessageBanner from '../components/MessageBanner.js'
import PrimaryButton from '../components/PrimaryButton.js'
import ScreenShell from '../components/ScreenShell.js'
import TextField from '../components/TextField.js'
import { getSession } from '../lib/session.js'

export default function ChangePasswordScreen({ navigation }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setInfo('')
    if (!currentPassword || !newPassword) {
      setError('Vui lòng nhập đủ các trường mật khẩu.')
      return
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới cần ít nhất 6 ký tự.')
      return
    }
    if (newPassword !== confirm) {
      setError('Xác nhận mật khẩu mới không khớp.')
      return
    }
    const { token } = await getSession()
    if (!token) {
      navigation.navigate('Login')
      return
    }
    setLoading(true)
    try {
      await changePasswordApi({ token, currentPassword, newPassword })
      setInfo('Đã đổi mật khẩu thành công.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      setError(err.message || 'Đổi mật khẩu thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScreenShell title="Đổi mật khẩu" subtitle="Nhập mật khẩu hiện tại và mật khẩu mới bạn muốn dùng.">
      <MessageBanner message={info} tone="info" />
      <MessageBanner message={error} />
      <TextField
        label="Mật khẩu hiện tại"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="••••••••"
        secureTextEntry
        editable={!loading}
      />
      <TextField
        label="Mật khẩu mới"
        value={newPassword}
        onChangeText={setNewPassword}
        placeholder="Ít nhất 6 ký tự"
        secureTextEntry
        editable={!loading}
      />
      <TextField
        label="Xác nhận mật khẩu mới"
        value={confirm}
        onChangeText={setConfirm}
        placeholder="Nhập lại mật khẩu mới"
        secureTextEntry
        editable={!loading}
      />
      <PrimaryButton title={loading ? 'Đang xử lý…' : 'Xác nhận đổi mật khẩu'} onPress={handleSubmit} loading={loading} />
    </ScreenShell>
  )
}
