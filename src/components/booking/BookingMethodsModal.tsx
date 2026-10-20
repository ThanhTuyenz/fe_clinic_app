import React, { useEffect, useMemo, useRef } from 'react'
import {
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useBookingStore } from '../../store/useBookingStore'

interface BookingMethodsModalProps {
  visible: boolean
  onClose: () => void
}

interface MethodMeta {
  id: string
  title: string
  desc: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bgColor: string
  borderColor: string
  path: string
}

// Danh sách cố định 5 hình thức khám chính thức (đã bỏ Tái khám và Gói khám sức khỏe)
const FIXED_BOOKING_METHODS: MethodMeta[] = [
  {
    id: 'specialty',
    title: 'Khám Chuyên Khoa',
    desc: 'Hơn 12 chuyên khoa mũi nhọn (Tim mạch, Mắt, Nhi, Da liễu...)',
    icon: 'medkit-outline',
    color: '#28a745',
    bgColor: '#f0faf2',
    borderColor: '#d9f2df',
    path: '/booking/specialty',
  },
  {
    id: 'doctor',
    title: 'Khám Cùng Bác Sĩ',
    desc: 'Chủ động chọn bác sĩ CKI - CKII theo học hàm và kinh nghiệm',
    icon: 'person-outline',
    color: '#1d4ed8',
    bgColor: '#eff6ff',
    borderColor: '#dbeafe',
    path: '/booking/doctor',
  },
  {
    id: 'online',
    title: 'Tư Vấn Online',
    desc: 'Gọi video 1:1 cùng bác sĩ, đọc kết quả xét nghiệm từ xa',
    icon: 'videocam-outline',
    color: '#0f766e',
    bgColor: '#f0fdfa',
    borderColor: '#ccfbf1',
    path: '/booking/online',
  },
  {
    id: 'family',
    title: 'Khám Gia Đình',
    desc: 'Chăm sóc ông bà, cha mẹ và con nhỏ trên cùng một tài khoản',
    icon: 'people-outline',
    color: '#7c3aed',
    bgColor: '#f5f3ff',
    borderColor: '#ede9fe',
    path: '/booking/specialty?flow=family',
  },
  {
    id: 'after-hours',
    title: 'Khám Ngoài Giờ',
    desc: '17:00 - 20:30 tiện lợi cho người bận rộn, không lo chờ đợi',
    icon: 'time-outline',
    color: '#b45309',
    bgColor: '#fefce8',
    borderColor: '#fef08a',
    path: '/booking/after-hours',
  },
]

export const BookingMethodsModal: React.FC<BookingMethodsModalProps> = ({
  visible,
  onClose,
}) => {
  const router = useRouter()
  const { setBookingMethod, setIsAfterHours, resetBooking } = useBookingStore()

  const translateY = useRef(new Animated.Value(0)).current
  const handleBarRef = useRef<any>(null)

  // Reset lại trạng thái và vị trí mỗi khi mở modal
  useEffect(() => {
    if (visible) {
      translateY.setValue(0)
    }
  }, [visible, translateY])

  const dismissModal = () => {
    Animated.timing(translateY, {
      toValue: 600,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      translateY.setValue(0)
      onClose()
    })
  }

  const resetModal = () => {
    Animated.spring(translateY, {
      toValue: 0,
      friction: 8,
      tension: 65,
      useNativeDriver: Platform.OS !== 'web',
    }).start()
  }

  // Lắng nghe sự kiện kéo chuột trên Web (Pointer Events DOM)
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return
    const el = handleBarRef.current
    if (!el) return

    const domNode = (el.setPointerCapture ? el : el._node || el.getDOMNode?.()) as HTMLElement | null
    if (!domNode || typeof domNode.addEventListener !== 'function') return

    let isDragging = false
    let startY = 0

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      isDragging = true
      startY = e.clientY
      try {
        domNode.setPointerCapture(e.pointerId)
      } catch (_) {}
      e.preventDefault()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return
      const dy = e.clientY - startY
      if (dy > 0) {
        translateY.setValue(dy)
      } else {
        translateY.setValue(0)
      }
    }

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return
      isDragging = false
      try {
        domNode.releasePointerCapture(e.pointerId)
      } catch (_) {}

      const dy = e.clientY - startY
      if (dy > 45) {
        dismissModal()
      } else {
        resetModal()
      }
    }

    domNode.addEventListener('pointerdown', onPointerDown)
    domNode.addEventListener('pointermove', onPointerMove)
    domNode.addEventListener('pointerup', onPointerUp)
    domNode.addEventListener('pointercancel', onPointerUp)

    return () => {
      domNode.removeEventListener('pointerdown', onPointerDown)
      domNode.removeEventListener('pointermove', onPointerMove)
      domNode.removeEventListener('pointerup', onPointerUp)
      domNode.removeEventListener('pointercancel', onPointerUp)
    }
  }, [visible, onClose])

  // Xử lý cử chỉ vuốt/kéo xuống trên Native (iOS / Android)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dy > 0) {
            translateY.setValue(gestureState.dy)
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 50 || gestureState.vy > 0.5) {
            dismissModal()
          } else {
            resetModal()
          }
        },
      }),
    [onClose, translateY]
  )

  const handleSelectMethod = (item: MethodMeta) => {
    onClose()
    setTimeout(() => {
      const id = item.id.toLowerCase()
      resetBooking()

      if (id === 'specialty') {
        setBookingMethod('SPECIALTY_EXAM')
        setIsAfterHours(false)
        router.push('/booking?method=specialty')
      } else if (id === 'doctor') {
        setBookingMethod('CONSULTATION')
        setIsAfterHours(false)
        router.push('/booking?method=doctor')
      } else if (id === 'online') {
        setBookingMethod('ONLINE_CONSULTATION')
        setIsAfterHours(false)
        router.push('/booking?method=online')
      } else if (id === 'family') {
        setBookingMethod('FAMILY_BOOKING')
        setIsAfterHours(false)
        router.push('/booking?method=family')
      } else if (id === 'after-hours') {
        setBookingMethod('AFTER_HOURS')
        setIsAfterHours(true)
        router.push('/booking?mode=after-hours' as any)
      } else {
        setBookingMethod('SPECIALTY_EXAM')
        setIsAfterHours(false)
        router.push('/booking?method=specialty')
      }
    }, 150)
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        <Animated.View
          style={[
            {
              transform: [{ translateY }],
              backgroundColor: '#ffffff',
              width: '100%',
              maxWidth: 480,
              maxHeight: '82%',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              paddingHorizontal: 16,
              paddingBottom: 20,
              borderTopWidth: 1,
              borderColor: '#f1f5f9',
              elevation: 12,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
            },
          ]}
          // @ts-ignore Web event stop propagation
          onClick={(e: any) => e.stopPropagation?.()}
        >
          {/* Thanh gạt trên đỉnh: hỗ trợ vừa CLICK vừa KÉO để đóng modal */}
          <TouchableOpacity
            ref={handleBarRef}
            activeOpacity={0.7}
            onPress={dismissModal}
            {...panResponder.panHandlers}
            style={
              {
                paddingTop: 10,
                paddingBottom: 12,
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                cursor: 'grab',
                touchAction: 'none',
                userSelect: 'none',
              } as any
            }
          >
            <View
              style={{
                width: 44,
                height: 5,
                borderRadius: 3,
                backgroundColor: '#cbd5e1',
              }}
            />
          </TouchableOpacity>

          {/* Tiêu đề & Nút đóng */}
          <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-slate-100">
            <View className="flex-1 mr-2">
              <Text className="text-base font-black text-slate-900 tracking-tight">
                Phương thức đặt lịch khám
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                Dữ liệu hình thức khám chính thức kết nối từ phòng khám VitaCare
              </Text>
            </View>
            <TouchableOpacity
              onPress={dismissModal}
              className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Danh sách 5 phương thức cố định */}
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 10, paddingBottom: 16 }}
          >
            {FIXED_BOOKING_METHODS.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.75}
                onPress={() => handleSelectMethod(item)}
                className="flex-row items-center p-3.5 rounded-lg bg-white border border-slate-200/90 shadow-2xs active:bg-slate-50"
              >
                {/* Icon với nền pastel chuẩn y tế */}
                <View
                  style={{
                    backgroundColor: item.bgColor,
                    borderColor: item.borderColor,
                  }}
                  className="w-11 h-11 rounded-lg items-center justify-center mr-3.5 shrink-0 border"
                >
                  <Ionicons name={item.icon} size={21} color={item.color} />
                </View>

                {/* Tiêu đề và mô tả */}
                <View className="flex-1 pr-2">
                  <Text
                    numberOfLines={1}
                    className="text-sm font-extrabold text-slate-800"
                  >
                    {item.title}
                  </Text>
                  <Text numberOfLines={2} className="text-xs text-slate-500 mt-1 leading-snug">
                    {item.desc}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  )
}
