import { useState } from 'react'
import { View } from 'react-native'
import { SelectInput } from '../common/SelectInput'
import { SelectModal } from '../common/SelectModal'
import { DOCTOR_EXPERIENCE_OPTIONS, DOCTOR_PRICE_OPTIONS } from '../../utils/doctorFilters'
export function DoctorFilterControls({ price, experience, onPrice, onExperience, online = false }: { price: string; experience: string; onPrice: (value: string) => void; onExperience: (value: string) => void; online?: boolean }) {
  const [picker, setPicker] = useState<'price' | 'experience' | null>(null)
  const options = picker === 'experience' ? DOCTOR_EXPERIENCE_OPTIONS : DOCTOR_PRICE_OPTIONS
  return <View>
    <View className="flex-row gap-3"><View className="flex-1"><SelectInput label={online ? 'Phí tư vấn' : 'Phí khám'} value={DOCTOR_PRICE_OPTIONS.find(item => item.id === price)?.title} onPress={() => setPicker('price')} /></View><View className="flex-1"><SelectInput label="Kinh nghiệm" value={DOCTOR_EXPERIENCE_OPTIONS.find(item => item.id === experience)?.title} onPress={() => setPicker('experience')} /></View></View>
    <SelectModal visible={Boolean(picker)} title={picker === 'experience' ? 'Kinh nghiệm bác sĩ' : 'Khoảng giá (VNĐ)'} options={options} selectedId={picker === 'experience' ? experience : price} onClose={() => setPicker(null)} onSelect={option => { if (picker === 'experience') onExperience(String(option.id)); else onPrice(String(option.id)); setPicker(null) }} />
  </View>
}
