import { useEffect } from 'react'
import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'

// Cấu hình thông báo khi app đang mở (Foreground) - Chỉ chạy trên Native (iOS / Android)
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
}

export function useNotifications() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      registerForPushNotificationsAsync()
    }
  }, [])

  async function registerForPushNotificationsAsync() {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#059669',
        })
      }

      const settings = (await Notifications.getPermissionsAsync()) as any
      let granted = settings.granted || settings.status === 'granted'
      if (!granted) {
        const req = (await Notifications.requestPermissionsAsync()) as any
        granted = req.granted || req.status === 'granted'
      }
      return granted
    } catch (e) {
      console.warn('Lỗi khi thiết lập expo-notifications:', e)
      return false
    }
  }

  async function scheduleAppointmentReminder(
    appointmentId: string | number,
    doctorName: string,
    appointmentTime: string,
    triggerDate: Date
  ) {
    try {
      if (triggerDate.getTime() > Date.now()) {
        const secondsUntil = Math.max(1, Math.floor((triggerDate.getTime() - Date.now()) / 1000))
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ Nhắc nhở lịch khám sắp tới',
            body: `Bạn có lịch khám với ${doctorName} vào lúc ${appointmentTime}. Vui lòng đến sớm 15 phút để chuẩn bị.`,
            data: { appointmentId, url: `/appointments` },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntil,
          },
        })
      }
    } catch (e) {
      console.warn('Không thể lên lịch thông báo:', e)
    }
  }

  return { scheduleAppointmentReminder }
}
