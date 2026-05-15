import { getApiBase, parseJsonResponse } from './apiBase.js'

function authHeaders(token) {
  const t = String(token || '').trim()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

/** Một số backend chỉ chấp nhận tin nhắn bắt đầu từ phía user — bỏ các assistant liên tiếp ở đầu (vd. lời chào local). */
export function sanitizeAiMessagesForApi(messages) {
  const arr = (Array.isArray(messages) ? messages : [])
    .map((m) => ({
      role: String(m?.role || '').toLowerCase(),
      content: String(m?.content || '').trim(),
    }))
    .filter((m) => m.content && (m.role === 'user' || m.role === 'assistant'))

  let i = 0
  while (i < arr.length && arr[i].role === 'assistant') i += 1
  return arr.slice(i)
}

export async function aiChat({ token, messages, state, signal }) {
  if (String(process.env.EXPO_PUBLIC_AI_MOCK || '').trim() === '1') {
    await new Promise((resolve) => setTimeout(resolve, 350))
    const lastUser = [...sanitizeAiMessagesForApi(messages)].reverse().find((m) => m.role === 'user')
    return {
      reply: `[Mock] Bạn: “${String(lastUser?.content || '').slice(0, 200)}”. Tắt EXPO_PUBLIC_AI_MOCK để gọi POST /api/ai/chat trên máy chủ.`,
      state: state && typeof state === 'object' && !Array.isArray(state) ? state : {},
    }
  }

  const base = getApiBase()
  const payloadMessages = sanitizeAiMessagesForApi(messages)
  if (!payloadMessages.length) {
    throw new Error('Không có tin nhắn hợp lệ để gửi tới AI.')
  }

  let res
  try {
    res = await fetch(`${base}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(token),
      },
      body: JSON.stringify({
        messages: payloadMessages,
        state: state && typeof state === 'object' && !Array.isArray(state) ? state : {},
      }),
      signal,
    })
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new Error('Yêu cầu AI đã bị hủy hoặc hết thời gian chờ.')
    }
    throw new Error(
      'Không kết nối được máy chủ. Kiểm tra EXPO_PUBLIC_API_URL (dùng IP LAN khi chạy trên điện thoại), backend đang chạy và route POST /api/ai/chat.',
    )
  }

  const data = await parseJsonResponse(res)
  if (!res.ok) {
    const hint =
      res.status === 401 || res.status === 403
        ? ' Phiên đăng nhập có thể đã hết — thử đăng xuất và đăng nhập lại.'
        : res.status === 404
          ? ' Không thấy API /api/ai/chat trên máy chủ (cần triển khai hoặc đúng phiên bản backend).'
          : ''
    const err = new Error((data?.message || `Lỗi ${res.status} từ máy chủ.`) + hint)
    err.status = res.status
    throw err
  }
  return data
}
