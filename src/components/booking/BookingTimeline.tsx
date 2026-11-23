import React from 'react'
import { View, Text } from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

export type BookingStep = 1 | 2 | 3 | 4

interface BookingTimelineProps {
  currentStep: BookingStep
}

const STEPS = [
  { step: 1 as BookingStep, title: 'Chọn lịch' },
  { step: 2 as BookingStep, title: 'Người khám' },
  { step: 3 as BookingStep, title: 'Xác nhận' },
  { step: 4 as BookingStep, title: 'Thanh toán' },
]

export const BookingTimeline: React.FC<BookingTimelineProps> = ({ currentStep }) => {
  return (
    <View className="bg-white border-b border-slate-100 px-2 pt-3 pb-2.5">
      <View className="flex-row">
        {STEPS.map((item, idx) => {
          const isCompleted = item.step < currentStep
          const isCurrent = item.step === currentStep
          const isLast = idx === STEPS.length - 1

          return (
            <View key={item.step} className="flex-1 items-center relative">
              {/* Đường nối giữa các node (nằm chính giữa trục tâm của 2 vòng tròn) */}
              {!isLast && (
                <View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: 11.25, // Chính giữa tâm vòng tròn 24px (24 - 1.5)/2 = 11.25
                    left: '50%',
                    right: '-50%',
                    height: 1.5,
                    zIndex: 0,
                  }}
                  className={item.step < currentStep ? 'bg-primary-300' : 'bg-slate-100'}
                />
              )}

              {/* Vòng tròn số thứ tự - căn giữa tuyệt đối */}
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  zIndex: 1,
                }}
                className={`items-center justify-center ${
                  isCompleted
                    ? 'border border-primary-200 bg-primary-50'
                    : isCurrent
                      ? 'border border-primary-300 bg-primary-50/80'
                      : 'border border-slate-200/70 bg-white'
                }`}
              >
                {isCompleted ? (
                  <Ionicons name="checkmark" size={12} color="#28a745" />
                ) : (
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      textAlign: 'center',
                      includeFontPadding: false,
                      textAlignVertical: 'center',
                      lineHeight: 14,
                    }}
                    className={isCurrent ? 'text-primary-700' : 'text-slate-400'}
                  >
                    {item.step}
                  </Text>
                )}
              </View>

              {/* Nhãn văn bản - đồng trục dọc 100% với vòng tròn phía trên */}
              <Text
                numberOfLines={1}
                className={`text-[11px] tracking-tight text-center mt-1.5 ${
                  isCurrent
                    ? 'font-semibold text-primary-700'
                    : isCompleted
                      ? 'font-medium text-primary-600'
                      : 'font-normal text-slate-400'
                }`}
              >
                {item.title}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}
