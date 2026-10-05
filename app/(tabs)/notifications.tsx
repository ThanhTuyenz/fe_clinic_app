import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { ScreenShell } from '@/components/common'
import {
  AppNotification,
  notificationService,
  NotificationType,
} from '@/services/notificationService'
import { useAuthStore } from '@/store/useAuthStore'

const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'APPOINTMENT_REMINDER':
      return {
        icon: 'time-outline' as const,
        color: '#d97706',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
      }
    case 'BOOKING_CONFIRMED':
      return {
        icon: 'checkmark-circle-outline' as const,
        color: '#059669',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
      }
    case 'MEDICAL_RESULT':
      return {
        icon: 'document-text-outline' as const,
        color: '#2563eb',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
      }
    case 'CONTACT_REPLY':
      return {
        icon: 'chatbubble-ellipses-outline' as const,
        color: '#7c3aed',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
      }
    default:
      return {
        icon: 'notifications-outline' as const,
        color: '#047857',
        bg: 'bg-slate-50',
        border: 'border-slate-200',
      }
  }
}

const formatTimeAgo = (dateStr: string) => {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Vừa xong'
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays === 1) return 'Hôm qua'
    if (diffDays < 7) return `${diffDays} ngày trước`
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
}

export default function NotificationsScreen() {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL')

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      setRefreshing(false)
      return
    }

    try {
      const res = await notificationService.getNotifications({ limit: 50 })
      setNotifications(res.items || [])
      setUnreadCount(res.unreadCount || 0)
    } catch (err) {
      console.error('Lỗi tải thông báo:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const onRefresh = () => {
    setRefreshing(true)
    fetchNotifications()
  }

  const handleMarkAsRead = async (item: AppNotification) => {
    if (!item.isRead) {
      await notificationService.markAsRead(item.id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }

    if (
      item.type === 'APPOINTMENT_REMINDER' ||
      item.type === 'BOOKING_CONFIRMED' ||
      item.data?.appointmentId
    ) {
      router.push('/(tabs)/appointments')
    } else if (item.type === 'MEDICAL_RESULT' || item.data?.recordId) {
      router.push('/(tabs)/records')
    }
  }

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const displayedNotifications =
    filter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications

  const renderItem = ({ item }: { item: AppNotification }) => {
    const style = getNotificationStyle(item.type)

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleMarkAsRead(item)}
        className={`p-3.5 rounded-lg mb-2.5 border ${
          item.isRead
            ? 'bg-white border-slate-200/80'
            : 'bg-emerald-50/40 border-emerald-200/90 shadow-2xs'
        }`}
      >
        <View className="flex-row items-start">
          <View
            className={`w-9 h-9 rounded-lg items-center justify-center mr-3 mt-0.5 border ${style.bg} ${style.border}`}
          >
            <Ionicons name={style.icon} size={18} color={style.color} />
          </View>
          <View className="flex-1 pr-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text
                numberOfLines={1}
                className={`text-sm flex-1 mr-2 ${
                  item.isRead ? 'font-bold text-slate-800' : 'font-extrabold text-emerald-950'
                }`}
              >
                {item.title}
              </Text>
              <Text className="text-[10px] text-slate-400 font-medium">
                {formatTimeAgo(item.createdAt)}
              </Text>
            </View>
            <Text
              numberOfLines={3}
              className={`text-xs leading-relaxed ${
                item.isRead ? 'text-slate-500' : 'text-slate-700'
              }`}
            >
              {item.content}
            </Text>
          </View>
          {!item.isRead && (
            <View className="w-2 h-2 rounded-full bg-emerald-600 mt-2 shrink-0" />
          )}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <ScreenShell title="Hộp thư thông báo">
      <View className="flex-1 px-4 pt-2">
        {/* Header Action Bar */}
        <View className="flex-row items-center justify-between py-2 mb-2">
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setFilter('ALL')}
              className={`px-3 py-1.5 rounded-md border ${
                filter === 'ALL'
                  ? 'bg-emerald-700 border-emerald-700'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  filter === 'ALL' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Tất cả ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilter('UNREAD')}
              className={`px-3 py-1.5 rounded-md border ${
                filter === 'UNREAD'
                  ? 'bg-emerald-700 border-emerald-700'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  filter === 'UNREAD' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Chưa đọc ({unreadCount})
              </Text>
            </TouchableOpacity>
          </View>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              className="flex-row items-center py-1 px-2"
            >
              <Ionicons name="checkmark-done-outline" size={14} color="#047857" />
              <Text className="text-xs font-bold text-emerald-700 ml-1">Đọc hết</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center py-16">
            <ActivityIndicator size="small" color="#059669" />
            <Text className="text-xs text-slate-400 mt-2 font-medium">Đang tải thông báo...</Text>
          </View>
        ) : !isAuthenticated ? (
          <View className="flex-1 items-center justify-center py-16 px-6">
            <Ionicons name="lock-closed-outline" size={36} color="#cbd5e1" />
            <Text className="text-sm font-bold text-slate-700 mt-3 text-center">
              Vui lòng đăng nhập
            </Text>
            <Text className="text-xs text-slate-400 text-center mt-1">
              Đăng nhập để xem thông báo nhắc lịch và kết quả khám của bạn
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login' as any)}
              className="mt-4 bg-emerald-700 px-5 py-2.5 rounded-lg shadow-xs"
            >
              <Text className="text-white text-xs font-bold">Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        ) : displayedNotifications.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16 px-6">
            <Ionicons name="notifications-off-outline" size={40} color="#cbd5e1" />
            <Text className="text-sm font-bold text-slate-700 mt-3 text-center">
              {filter === 'UNREAD' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            </Text>
            <Text className="text-xs text-slate-400 text-center mt-1">
              Các thông báo nhắc lịch khám 24h và 2h sẽ được cập nhật tự động tại đây.
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedNotifications}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
            }
          />
        )}
      </View>
    </ScreenShell>
  )
}
