import { useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { doctorService } from '../src/services/doctorService'
import { ScreenShell } from '../src/components/common/ScreenShell'
import { Button } from '../src/components/common/Button'
import { SelectInput } from '../src/components/common/SelectInput'
import { SelectModal } from '../src/components/common/SelectModal'
import { DoctorFilterControls } from '../src/components/booking/DoctorFilterControls'
import { DoctorCard } from '../src/components/booking/DoctorCard'
import { filterDoctors } from '../src/utils/doctorFilters'
import { useBookingStore } from '../src/store/useBookingStore'
export default function DoctorsScreen() {
  const router = useRouter()
  const { type } = useLocalSearchParams<{ type?: string }>()
  const online = type === 'online-consultation'
  const [search, setSearch] = useState('')
  const [branch, setBranch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [price, setPrice] = useState('all')
  const [experience, setExperience] = useState('all')
  const [picker, setPicker] = useState<'branch' | 'specialty' | null>(null)
  const branches = useQuery({ queryKey: ['branches'], queryFn: () => doctorService.getBranches() })
  const specialties = useQuery({ queryKey: ['specialties'], queryFn: () => doctorService.getSpecialties() })
  const doctors = useQuery({ queryKey: ['doctors', branch, specialty, online], queryFn: () => doctorService.getDoctors(branch || undefined, specialty ? Number(specialty) : undefined) })
  const filtered = filterDoctors((doctors.data || []).filter(doc => `${doc.fullName} ${doc.specialty_name}`.toLocaleLowerCase('vi').includes(search.trim().toLocaleLowerCase('vi'))), price, experience, online)
  return <ScreenShell showBackButton title={online ? 'Bác sĩ tư vấn trực tuyến' : 'Đội ngũ bác sĩ'}><ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
    <TextInput value={search} onChangeText={setSearch} placeholder="Tìm bác sĩ, chuyên khoa..." className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900" />
    <SelectInput label="Cơ sở" value={branches.data?.find(item => item.id === branch)?.name || 'Tất cả cơ sở'} onPress={() => setPicker('branch')} />
    <SelectInput label="Chuyên khoa" value={specialties.data?.find(item => String(item.id) === specialty)?.name || 'Tất cả chuyên khoa'} onPress={() => setPicker('specialty')} />
    <DoctorFilterControls price={price} experience={experience} onPrice={setPrice} onExperience={setExperience} online={online} />
    <Button title="Xóa bộ lọc" variant="outline" onPress={() => { setSearch(''); setBranch(''); setSpecialty(''); setPrice('all'); setExperience('all') }} className="mb-4" />
    {doctors.isLoading ? <ActivityIndicator color="#28a745" /> : doctors.isError ? <Button title="Không tải được bác sĩ. Thử lại" onPress={() => { void doctors.refetch() }} /> : !filtered.length ? <Text className="py-5 text-center text-slate-500">Không có bác sĩ phù hợp bộ lọc.</Text> : filtered.map(doc => <DoctorCard key={doc.id} doctor={doc} online={online} selected={false} onSelect={() => { useBookingStore.getState().resetBooking(); router.push({ pathname: online ? '/booking/online' : '/booking/doctor', params: { doctorId: String(doc.id), branchId: branch || doc.branchId || '' } }) }} />)}
  </ScrollView><View><SelectModal visible={Boolean(picker)} title={picker === 'branch' ? 'Chọn cơ sở' : 'Chọn chuyên khoa'} onClose={() => setPicker(null)} options={[{ id: '', title: 'Tất cả' }, ...(picker === 'branch' ? branches.data || [] : specialties.data || []).map(item => ({ id: String(item.id), title: item.name }))]} onSelect={option => { if (picker === 'branch') setBranch(String(option.id)); else setSpecialty(String(option.id)); setPicker(null) }} /></View></ScreenShell>
}
