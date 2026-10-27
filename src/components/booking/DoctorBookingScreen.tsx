import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'

import { useDoctorBooking } from '../../hooks/flows/useDoctorBooking'
import { ScreenShell } from '../common/ScreenShell'
import { Button } from '../common/Button'
import { BookingTimeline } from './BookingTimeline'
import { DoctorListSection } from './DoctorListSection'

export function DoctorBookingScreen({ online = false }: { online?: boolean }) {
  const {
    selectedDoctor,
    doctorSearch,
    setDoctorSearch,
    doctors,
    displayedDoctors,
    loadingDoctors,
    handleSelectDoctor,
    handleContinue,
  } = useDoctorBooking(online ? 'online' : 'doctor')

  return (
    <ScreenShell showBackButton title={online ? 'Tư vấn sức khỏe trực tuyến' : 'Đặt lịch khám bệnh'}>
      <BookingTimeline currentStep={1} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-white"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
        >
          {/* 1. Bác sĩ điều trị */}
          <View className="mb-6">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3.5">
              {online ? '1. Bác sĩ tư vấn online' : '1. Bác sĩ điều trị'}
            </Text>

            {/* Danh sách thẻ bác sĩ hiển thị trực tiếp */}
            <DoctorListSection
              method={online ? 'ONLINE_CONSULTATION' : 'CONSULTATION'}
              doctors={doctors}
              displayedDoctors={displayedDoctors}
              selectedDoctor={selectedDoctor}
              loadingDoctors={loadingDoctors}
              doctorSearch={doctorSearch}
              setDoctorSearch={setDoctorSearch}
              onSelectDoctor={handleSelectDoctor}
            />
          </View>
        </ScrollView>

        {/* Nút Tiếp tục */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-3">
          <Button
            title={selectedDoctor ? online ? 'Chọn thời gian' : 'Chọn thời gian khám' : 'Vui lòng chọn bác sĩ'}
            onPress={handleContinue}
            disabled={!selectedDoctor}
            className="py-3 rounded-lg w-full"
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
