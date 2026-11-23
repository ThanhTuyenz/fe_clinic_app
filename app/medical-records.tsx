import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { patientProfileService } from '../src/services/patientProfileService'
import { useAuthStore } from '../src/store/useAuthStore'
import { ScreenShell } from '../src/components/common/ScreenShell'
import { Button } from '../src/components/common/Button'
import { SelectInput } from '../src/components/common/SelectInput'
import { SelectModal } from '../src/components/common/SelectModal'
import { appointmentStatusTitle } from '../src/utils/appointmentStatus'
import { formatDateVi, formatCurrencyVi } from '../src/utils/date'
export default function MedicalRecordsScreen() {
  const router = useRouter()
  const { profileId } = useLocalSearchParams<{ profileId?: string }>()
  const { user, isAuthenticated } = useAuthStore()
  const [selected, setSelected] = useState(profileId || '')
  const [picker, setPicker] = useState(false)
  const profiles = useQuery({ queryKey: ['patientProfiles', user?.id], queryFn: () => patientProfileService.getPatientProfiles(), enabled: isAuthenticated })
  const id = selected || profiles.data?.find(item => item.isMainProfile)?.id || profiles.data?.[0]?.id
  const records = useQuery({ queryKey: ['medical-records', user?.id, id], queryFn: () => patientProfileService.getMedicalRecords(id!), enabled: isAuthenticated && Boolean(id) })
  const record = records.data
  return <ScreenShell showBackButton title="Bệnh án và lịch sử khám"><ScrollView contentContainerStyle={{ padding: 20 }}>
    {!isAuthenticated ? <Button title="Đăng nhập để xem bệnh án" onPress={() => router.push('/(auth)/login')} /> : <>
      <SelectInput label="Hồ sơ người khám" value={profiles.data?.find(item => item.id === id)?.fullName} onPress={() => setPicker(true)} loading={profiles.isLoading} />
      {(profiles.isLoading || records.isLoading) && <ActivityIndicator color="#28a745" />}
      {(profiles.isError || records.isError) && <Button title="Không tải được hồ sơ. Thử lại" onPress={() => { void profiles.refetch(); if (id) void records.refetch() }} />}
      {record && <View className="mb-4 rounded-xl border border-slate-200 bg-white p-4"><Text className="font-semibold text-slate-900">Thông tin sức khỏe</Text>{[['Mã hồ sơ', record.recordCode], ['Nhóm máu', record.bloodGroup], ['Chiều cao', record.height ? `${record.height} cm` : null], ['Cân nặng', record.weight ? `${record.weight} kg` : null], ['Tiền sử', record.medicalHistory], ['Dị ứng', record.allergies]].map(([label, value]) => <Text key={label} className="mt-2 text-slate-600">{label}: {value || 'Chưa cập nhật'}</Text>)}</View>}
      {!profiles.isLoading && !profiles.isError && !profiles.data?.length && <Text className="text-slate-500">Chưa có hồ sơ người khám.</Text>}
      {record && !record.visits?.length && <Text className="text-slate-500">Hồ sơ này chưa có lịch sử khám.</Text>}
      {(record?.visits || []).map((visit: any) => <View key={visit.id} className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <Text className="font-bold text-slate-900">{visit.visitCode} • {formatDateVi(visit.appointment?.appointmentDate || visit.createdAt)}</Text>
        <Text className="mt-2 text-primary-700">{appointmentStatusTitle(visit.status)}</Text>
        <Text className="mt-2 text-slate-600">{visit.appointment?.branch?.name} • {visit.appointment?.doctor?.fullName || 'Chưa phân công bác sĩ'}</Text>
        {[['Lý do khám', visit.reasonForVisit], ['Chẩn đoán sơ bộ', visit.preliminaryDiagnosis], ['Kết luận', visit.finalDiagnosis], ['Hướng dẫn điều trị', visit.treatmentPlan], ['Ghi chú', visit.notes]].map(([label, value]) => value ? <Text key={label} className="mt-2 text-slate-700">{label}: {value}</Text> : null)}
        {visit.appointment?.payment && <Text className="mt-3 text-slate-600">Thanh toán: {formatCurrencyVi(Number(visit.appointment.payment.amount))} • {visit.appointment.payment.status}</Text>}
        <TouchableOpacity onPress={() => router.push(`/booking/${visit.appointment?.id || visit.id}`)}><Text className="mt-3 font-semibold text-primary-700">Xem lịch khám →</Text></TouchableOpacity>
      </View>)}
    </>}
  </ScrollView><SelectModal visible={picker} title="Chọn hồ sơ" onClose={() => setPicker(false)} options={(profiles.data || []).map(item => ({ id: item.id, title: item.fullName }))} selectedId={id} onSelect={option => { setSelected(String(option.id)); setPicker(false) }} /></ScreenShell>
}
