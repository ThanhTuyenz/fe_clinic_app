import React from 'react'
import { View } from 'react-native'
import { Calendar, LocaleConfig } from 'react-native-calendars'

LocaleConfig.locales['vi'] = {
  monthNames: [
    'Tháng 1',
    'Tháng 2',
    'Tháng 3',
    'Tháng 4',
    'Tháng 5',
    'Tháng 6',
    'Tháng 7',
    'Tháng 8',
    'Tháng 9',
    'Tháng 10',
    'Tháng 11',
    'Tháng 12',
  ],
  monthNamesShort: [
    'Th1',
    'Th2',
    'Th3',
    'Th4',
    'Th5',
    'Th6',
    'Th7',
    'Th8',
    'Th9',
    'Th10',
    'Th11',
    'Th12',
  ],
  dayNames: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
  dayNamesShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  today: 'Hôm nay',
}
LocaleConfig.defaultLocale = 'vi'

import { getTomorrowDateString } from '../../utils/date'

interface MedicalCalendarProps {
  selectedDate: string // YYYY-MM-DD
  onSelectDate: (dateString: string) => void
  availableDates?: string[]
}

export const MedicalCalendar: React.FC<MedicalCalendarProps> = ({
  selectedDate,
  onSelectDate,
  availableDates = [],
}) => {
  const tomorrow = getTomorrowDateString()

  const markedDates: Record<string, any> = {}

  // Đánh dấu các ngày có lịch khám khả dụng từ backend
  if (availableDates.length > 0) {
    availableDates.forEach((d) => {
      markedDates[d] = {
        marked: true,
        dotColor: '#28a745',
      }
    })
  }

  // Đánh dấu ngày đang được chọn
  if (selectedDate) {
    markedDates[selectedDate] = {
      ...(markedDates[selectedDate] || {}),
      selected: true,
      selectedColor: '#28a745',
      selectedTextColor: '#ffffff',
    }
  }

  return (
    <View className="bg-white rounded-lg p-2 border border-slate-100 shadow-sm overflow-hidden mb-4">
      <Calendar
        minDate={tomorrow}
        current={selectedDate || tomorrow}
        onDayPress={(day: { dateString: string }) => {
          if (day.dateString < tomorrow) return
          onSelectDate(day.dateString)
        }}
        markedDates={markedDates}
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#64748b',
          selectedDayBackgroundColor: '#28a745',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#28a745',
          dayTextColor: '#1e293b',
          textDisabledColor: '#cbd5e1',
          arrowColor: '#28a745',
          monthTextColor: '#0f172a',
          textDayFontWeight: '500',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '600',
          textDayFontSize: 15,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 13,
        }}
      />
    </View>
  )
}
