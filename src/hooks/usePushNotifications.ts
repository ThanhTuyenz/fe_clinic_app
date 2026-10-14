import { useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import type * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import { notificationService } from '../services/notificationService'
import { getNotifications } from '../utils/notifications'

export function usePushNotifications(isAuthenticated: boolean) {
  const router = useRouter()
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const notificationListener = useRef<Notifications.Subscription | null>(null)
  const responseListener = useRef<Notifications.Subscription | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      setExpoPushToken(null)
      return
    }
    const Notifications = getNotifications()
    if (!Notifications) return
    let active = true

    registerForPushNotificationsAsync().then((token) => {
      if (active && token) {
        setExpoPushToken(token)
        notificationService.saveDeviceToken(token, Platform.OS)
      }
    })

    // Lắng nghe khi nhận thông báo trong lúc app đang chạy
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('🔔 Đã nhận notification:', notification.request.content)
    })

    // Lắng nghe khi người dùng bấm vào thông báo nổi trên thanh trạng thái
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data
      console.log('👆 Người dùng chạm vào notification với data:', data)

      if (data?.appointmentId || data?.bookingCode) {
        router.push('/(tabs)/appointments')
      } else if (data?.recordId) {
        router.push('/(tabs)/records')
      } else {
        router.push('/(tabs)/notifications')
      }
    })

    return () => {
      active = false
      if (notificationListener.current) {
        notificationListener.current.remove()
      }
      if (responseListener.current) {
        responseListener.current.remove()
      }
    }
  }, [isAuthenticated, router])

  return { expoPushToken }
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Notifications = getNotifications()
  if (!Notifications) return null

  let token: string | null = null

  try {
    // Android requires a notification channel before requesting notification permission.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#28a745',
      })
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('Không được cấp quyền nhận thông báo Push')
      return null
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId

    if (!projectId) {
      console.warn('Chưa cấu hình EAS projectId để đăng ký Push Notification.')
      return null
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId })
    token = pushTokenData.data

  } catch (error) {
    console.log('Lỗi đăng ký Push Notification:', error)
  }

  return token
}
