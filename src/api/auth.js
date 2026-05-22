import { getApiBase, networkErrorMessage, parseJsonResponse } from './apiBase.js'

async function parseJson(res) {
  return parseJsonResponse(res)
}

export async function startRegister({ email }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/start-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Gửi OTP thất bại.')
  }
  return data
}

export async function verifyEmail({ verificationToken, otp }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken, otp: String(otp).trim() }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Xác thực thất bại.')
  }
  return data
}

export async function completeRegister({ completeToken, firstName, lastName, phone, password }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/complete-register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completeToken, firstName, lastName, phone, password }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Hoàn tất đăng ký thất bại.')
  }
  return data
}

export async function resendOtp({ email }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Gửi lại mã thất bại.')
  }
  return data
}

export async function login({ email, password }) {
  const base = getApiBase()
  let res
  try {
    res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  } catch (err) {
    throw new Error(networkErrorMessage(base, err))
  }
  const data = await parseJson(res)
  if (!res.ok) {
    const err = new Error(data.message || 'Đăng nhập thất bại.')
    if (data.code) err.code = data.code
    if (data.email) err.email = data.email
    if (data.emailMask) err.emailMask = data.emailMask
    if (data.verificationToken) err.verificationToken = data.verificationToken
    throw err
  }
  return data
}

export async function getMe({ token }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Không lấy được hồ sơ bệnh nhân.')
  }
  return data
}

export async function updateMe({ token, payload }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload || {}),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Không cập nhật được hồ sơ bệnh nhân.')
  }
  return data
}

/** Backend: POST /api/auth/change-password { currentPassword, newPassword } */
export async function changePassword({ token, currentPassword, newPassword }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Đổi mật khẩu thất bại.')
  }
  return data
}

export async function startForgotPassword({ email }) {
  const base = getApiBase()
  let res
  try {
    res = await fetch(`${base}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  } catch (err) {
    throw new Error(networkErrorMessage(base, err))
  }
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Không gửi được yêu cầu đặt lại mật khẩu.')
  }
  return data
}

export async function resendForgotPasswordOtp({ email }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/forgot-password-resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Gửi lại mã thất bại.')
  }
  return data
}

export async function verifyForgotPasswordOtp({ verificationToken, otp }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/forgot-password-verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ verificationToken, otp: String(otp).trim() }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Xác thực thất bại.')
  }
  return data
}

export async function resetPasswordWithToken({ resetToken, newPassword }) {
  const base = getApiBase()
  const res = await fetch(`${base}/api/auth/forgot-password-reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resetToken, newPassword }),
  })
  const data = await parseJson(res)
  if (!res.ok) {
    throw new Error(data.message || 'Đặt lại mật khẩu thất bại.')
  }
  return data
}
