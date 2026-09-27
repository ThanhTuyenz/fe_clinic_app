import React from 'react'
import { Alert, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useBookingStore } from '../../src/store/useBookingStore'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useCreateAppointment } from '../../src/hooks/useBooking'
import { useNotifications } from '../../src/hooks/useNotifications'
import { PatientInfoFormValues } from '../../src/utils/validation'
import { PatientForm } from '../../src/components/forms/PatientForm'
import { ScreenShell } from '../../src/components/common/ScreenShell'

export default function PatientInfoScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const {
    draft,
    setPatientInfo,
    addPrescriptionImage,
    removePrescriptionImage,
    resetBooking,
  } = useBookingStore()

  const { scheduleAppointmentReminder } = useNotifications()
  const createAppointmentMutation = useCreateAppointment()

  const initialValues: Partial<PatientInfoFormValues> = {
    patientType: draft.patientType || 'self',
    patientName: draft.patientName || user?.full_name || user?.fullName || '',
    patientPhone: draft.patientPhone || user?.phone || '',
    patientDob: draft.patientDob || user?.date_of_birth || '',
    patientGender: draft.patientGender || (user?.gender === 'female' ? 'female' : 'male'),
    patientCccd: draft.patientCccd || '',
    symptoms: draft.symptoms || '',
  }

  const handleSubmit = async (formValues: PatientInfoFormValues) => {
    if (!draft.doctor?.id || !draft.date || !draft.slot) {
      Alert.alert('Thiếu thông tin', 'Vui lòng hoàn tất việc chọn bác sĩ và ngày giờ khám trước.')
      router.replace('/booking/select-doctor')
      return
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Quý khách vui lòng đăng nhập để lưu trữ phiếu khám và nhận kết quả.',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đăng nhập',
            onPress: () => router.push('/(auth)/login'),
          },
        ]
      )
      return
    }

    try {
      setPatientInfo(formValues)

      const result = await createAppointmentMutation.mutateAsync({
        doctorId: draft.doctor.id,
        appointmentDate: draft.date,
        startTime: draft.slot,
        note: formValues.symptoms,
        symptoms: formValues.symptoms,
        patientType: formValues.patientType,
        patientName: formValues.patientName,
        patientPhone: formValues.patientPhone,
        patientDob: formValues.patientDob,
        patientGender: formValues.patientGender,
        medicalRecords: draft.prescriptionImages,
      })

      const appointmentId = result.appointment?.id || result.appointment?._id || 'new'
      const docName =
        draft.doctor.full_name || draft.doctor.fullName || draft.doctor.name || 'Bác sĩ'

      // Lên lịch thông báo nhắc khám trước ngày khám
      const appointmentDateObj = new Date(draft.date)
      const reminderDate = new Date(appointmentDateObj.getTime() - 24 * 60 * 60 * 1000)
      scheduleAppointmentReminder(
        appointmentId,
        docName,
        `${draft.slot} ngày ${draft.date}`,
        reminderDate
      )

      // Reset state booking
      resetBooking()

      // Chuyển sang màn hình xác nhận phiếu khám
      router.replace(`/booking/${appointmentId}`)
    } catch (err: any) {
      Alert.alert('Đặt lịch thất bại', err.message || 'Không thể tạo lịch khám, vui lòng thử lại sau.')
    }
  }

  return (
    <ScreenShell showBackButton title="Bước 3: Thông tin người khám">
      <View className="flex-1 px-5 pt-3">
        <PatientForm
          initialValues={initialValues}
          prescriptionImages={draft.prescriptionImages}
          onAddImage={addPrescriptionImage}
          onRemoveImage={removePrescriptionImage}
          onSubmit={handleSubmit}
          isLoading={createAppointmentMutation.isPending}
        />
      </View>
    </ScreenShell>
  )
}
