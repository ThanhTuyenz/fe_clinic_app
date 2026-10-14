import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native'

import { useDoctorBooking } from '../../../src/hooks/flows/useDoctorBooking'
import { ScreenShell } from '../../../src/components/common/ScreenShell'
import { Button } from '../../../src/components/common/Button'
import {
  BookingTimeline,
  DoctorListSection,
} from '../../../src/components/booking'

export default function DoctorBookingScreen() {
  const {
    selectedDoctor,
    doctorSearch,
    setDoctorSearch,
    doctors,
    displayedDoctors,
    loadingDoctors,
    handleSelectDoctor,
    handleContinue,
  } = useDoctorBooking()

  return (
    <ScreenShell showBackButton title="Đặt lịch khám bệnh">
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
              1. Bác sĩ điều trị
            </Text>

            {/* Danh sách thẻ bác sĩ hiển thị trực tiếp */}
            <DoctorListSection
              method="CONSULTATION"
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
            title={selectedDoctor ? 'Tiếp tục: Chọn thời gian khám' : 'Vui lòng chọn bác sĩ'}
            onPress={handleContinue}
            disabled={!selectedDoctor}
            className="py-3 rounded-lg w-full"
          />
        </View>
      </KeyboardAvoidingView>
    </ScreenShell>
  )
}
