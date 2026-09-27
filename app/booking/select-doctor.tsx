import React, { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { doctorService } from '../../src/services/doctorService'
import { useBookingStore } from '../../src/store/useBookingStore'
import { DoctorCard } from '../../src/components/booking/DoctorCard'
import { Doctor } from '../../src/types/doctor'
import { ScreenShell } from '../../src/components/common/ScreenShell'

export default function SelectDoctorScreen() {
  const router = useRouter()
  const setDoctor = useBookingStore((state) => state.setDoctor)
  const currentDoctor = useBookingStore((state) => state.draft.doctor)

  const [search, setSearch] = useState('')
  const [selectedDeptId, setSelectedDeptId] = useState<string | number | 'all'>('all')

  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorService.getDoctors,
  })

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: doctorService.getDepartments,
  })

  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const name = (doc.full_name || doc.fullName || doc.name || '').toLowerCase()
      const specialty = (doc.specialty_name || doc.specialty || '').toString().toLowerCase()
      const searchLower = search.toLowerCase()

      const matchesSearch = !search || name.includes(searchLower) || specialty.includes(searchLower)
      const matchesDept =
        selectedDeptId === 'all' ||
        String(doc.department_id) === String(selectedDeptId) ||
        String(doc.department) === String(selectedDeptId)

      return matchesSearch && matchesDept
    })
  }, [doctors, search, selectedDeptId])

  const handleSelectDoctor = (doctor: Doctor) => {
    setDoctor(doctor)
    router.push('/booking/select-datetime')
  }

  return (
    <ScreenShell showBackButton title="Bước 1: Chọn bác sĩ">
      <View className="flex-1 px-5 pt-3">
        {/* Thanh tìm kiếm */}
        <View className="flex-row items-center bg-white rounded-2xl border border-slate-200 px-3.5 py-2.5 mb-3 shadow-xs">
          <Ionicons name="search-outline" size={20} color="#94a3b8" />
          <TextInput
            placeholder="Tìm theo tên bác sĩ hoặc chuyên khoa..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            className="flex-1 ml-2 text-slate-800 text-sm py-0"
          />
          {Boolean(search) && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Thanh lọc Chuyên khoa */}
        <View className="mb-3.5">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-5 px-5">
            <TouchableOpacity
              onPress={() => setSelectedDeptId('all')}
              className={`mr-2 px-3.5 py-2 rounded-xl border ${
                selectedDeptId === 'all'
                  ? 'bg-sky-600 border-sky-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedDeptId === 'all' ? 'text-white' : 'text-slate-600'
                }`}
              >
                Tất cả khoa
              </Text>
            </TouchableOpacity>
            {departments.map((dept) => {
              const isSelected = selectedDeptId === dept.id
              return (
                <TouchableOpacity
                  key={dept.id}
                  onPress={() => setSelectedDeptId(dept.id!)}
                  className={`mr-2 px-3.5 py-2 rounded-xl border ${
                    isSelected
                      ? 'bg-sky-600 border-sky-600'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isSelected ? 'text-white' : 'text-slate-600'
                    }`}
                  >
                    {dept.name}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        </View>

        {/* Danh sách Bác sĩ */}
        {loadingDoctors ? (
          <ActivityIndicator size="small" color="#0284c7" className="py-12" />
        ) : filteredDoctors.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="search-outline" size={48} color="#cbd5e1" />
            <Text className="text-slate-500 text-sm mt-3">
              Không tìm thấy bác sĩ phù hợp với tiêu chí lọc.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredDoctors}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <DoctorCard
                doctor={item}
                selected={String(currentDoctor?.id) === String(item.id)}
                onSelect={handleSelectDoctor}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </ScreenShell>
  )
}
