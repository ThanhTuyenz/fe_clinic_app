export const GOOGLE_LOGIN_LABELS = {
  preparing: 'Đang chuẩn bị đăng nhập…',
  playServices: 'Đang kiểm tra dịch vụ Google…',
  signOut: 'Đang chuẩn bị chọn tài khoản…',
  account: 'Đang chờ bạn chọn tài khoản Google…',
  backend: 'Đang xác thực tài khoản…',
  storage: 'Đang hoàn tất đăng nhập…',
} as const

export type GoogleLoginStage = keyof typeof GOOGLE_LOGIN_LABELS
export type GoogleLoginStep = <T>(stage: GoogleLoginStage, task: () => Promise<T>) => Promise<T>

// Only durations and fixed stage names are logged; never tokens or account details.
export function createGoogleLoginStep(onStage?: (stage: GoogleLoginStage) => void): GoogleLoginStep {
  return async (stage, task) => {
    onStage?.(stage)
    const started = performance.now()
    let succeeded = false
    try {
      const result = await task()
      succeeded = true
      return result
    } finally {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.info(`[GoogleLogin] ${stage}: ${Math.round(performance.now() - started)}ms (${succeeded ? 'completed' : 'failed'})`)
      }
    }
  }
}
