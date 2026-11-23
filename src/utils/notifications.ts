import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

type NotificationsModule = typeof import('expo-notifications')

let notifications: NotificationsModule | null | undefined

export function getNotifications(): NotificationsModule | null {
  if (Platform.OS === 'web' || isRunningInExpoGo()) return null
  if (notifications !== undefined) return notifications

  // Older native builds must be rebuilt before loading the SDK 58 notification API.
  if (
    Platform.OS === 'android' &&
    !requireOptionalNativeModule('ExpoTopicSubscriptionModule')
  ) {
    console.warn('Push notification chưa khả dụng. Hãy build và cài lại app Android với Expo SDK hiện tại.')
    notifications = null
    return null
  }

  try {
    // Keep this import behind the runtime checks: the package loads native modules immediately.
    notifications = require('expo-notifications') as NotificationsModule
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    })
    return notifications
  } catch (error) {
    console.warn('Không thể khởi tạo thông báo. Hãy build và cài lại app:', error)
    notifications = null
    return null
  }
}
