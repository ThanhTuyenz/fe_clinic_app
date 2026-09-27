import React from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useAuthStore } from '../../src/store/useAuthStore'
import { useBookingStore } from '../../src/store/useBookingStore'
import { doctorService } from '../../src/services/doctorService'
import { DoctorCard } from '../../src/components/booking/DoctorCard'
import { Doctor } from '../../src/types/doctor'
import { ScreenShell } from '../../src/components/common/ScreenShell'

export default function HomeScreen() {
  const router = useRouter()
  const { user, isAuthenticated } = useAuthStore()
  const setDoctor = useBookingStore((state) => state.setDoctor)

  const {
    data: doctors = [],
    isLoading: loadingDoctors,
    refetch: refetchDoctors,
    isRefetching,
  } = useQuery({
    queryKey: ['doctors'],
    queryFn: doctorService.getDoctors,
  })

  const { data: departments = [], refetch: refetchDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: doctorService.getDepartments,
  })

  const handleSelectDoctor = (doc: Doctor) => {
    setDoctor(doc)
    router.push('/booking/select-datetime')
  }

  const handleStartBooking = () => {
    router.push('/booking/select-doctor')
  }

  const patientName = user?.full_name || user?.fullName || user?.name || 'Quý khách'

  return (
    <ScreenShell>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetchDoctors()
              refetchDepts()
            }}
          />
        }
      >
        {/* Header Thông tin người dùng */}
        <View className="bg-white px-5 pt-3 pb-5 border-b border-slate-100 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-xs text-slate-400 font-medium">
              Xin chào bạn 👋
            </Text>
            <Text numberOfLines={1} className="text-lg font-black text-slate-800">
              {patientName}
            </Text>
          </View>

          {isAuthenticated ? (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/profile')}
              className="w-10 h-10 rounded-full bg-sky-100 items-center justify-center border border-sky-200"
            >
              <Ionicons name="person" size={20} color="#0284c7" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              className="bg-sky-600 px-3.5 py-2 rounded-xl"
            >
              <Text className="text-white text-xs font-bold">Đăng nhập</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Banner Đặt khám nhanh */}
        <View className="px-5 pt-4">
          <View className="bg-gradient-to-r from-sky-600 to-teal-600 bg-sky-600 rounded-3xl p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-white text-xl font-black">
                  Đặt khám online
                </Text>
                <Text className="text-sky-100 text-xs mt-1 leading-relaxed">
                  Chủ động chọn bác sĩ & giờ khám không lo xếp hàng chờ đợi
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleStartBooking}
                  className="bg-white mt-4 py-2.5 px-4 rounded-xl self-start flex-row items-center shadow-sm"
                >
                  <Text className="text-sky-700 font-bold text-xs mr-1">
                    Đặt lịch ngay
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color="#0369a1" />
                </TouchableOpacity>
              </View>
              <View className="w-16 h-16 rounded-2xl bg-white/20 items-center justify-center">
                <Ionicons name="calendar" size={32} color="#ffffff" />
              </View>
            </View>
          </View>
        </View>

        {/* Lối tắt tiện ích y tế (Quick Actions) */}
        <View className="px-5 pt-5 flex-row justify-between">
          <TouchableOpacity
            onPress={() => router.push('/booking/select-doctor')}
            className="flex-1 mr-2 bg-white p-3.5 rounded-2xl border border-slate-100 items-center shadow-xs"
          >
            <View className="w-10 h-10 rounded-xl bg-sky-50 items-center justify-center mb-2">
              <Ionicons name="medkit-outline" size={22} color="#0284c7" />
            </View>
            <Text className="text-xs font-bold text-slate-800 text-center">
              Đặt bác sĩ
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/ai-chat')}
            className="flex-1 mx-1 bg-white p-3.5 rounded-2xl border border-slate-100 items-center shadow-xs"
          >
            <View className="w-10 h-10 rounded-xl bg-teal-50 items-center justify-center mb-2">
              <Ionicons name="sparkles-outline" size={22} color="#0d9488" />
            </View>
            <Text className="text-xs font-bold text-slate-800 text-center">
              Tư vấn AI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(tabs)/appointments')}
            className="flex-1 ml-2 bg-white p-3.5 rounded-2xl border border-slate-100 items-center shadow-xs"
          >
            <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mb-2">
              <Ionicons name="time-outline" size={22} color="#d97706" />
            </View>
            <Text className="text-xs font-bold text-slate-800 text-center">
              Lịch của tôi
            </Text>
          </TouchableOpacity>
        </View>

        {/* Danh sách Khoa phòng */}
        <View className="pt-6">
          <View className="px-5 flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-slate-800">
              Chuyên khoa khám bệnh
            </Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept.id}
                onPress={handleStartBooking}
                className="bg-white mr-3 px-4 py-3 rounded-2xl border border-slate-100 items-center justify-center min-w-[110px] shadow-xs"
              >
                <View className="w-10 h-10 rounded-full bg-sky-50 items-center justify-center mb-2">
                  <Ionicons name="pulse-outline" size={20} color="#0284c7" />
                </View>
                <Text
                  numberOfLines={1}
                  className="text-xs font-bold text-slate-800 text-center"
                >
                  {dept.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Danh sách Bác sĩ tiêu biểu */}
        <View className="px-5 pt-6 pb-8">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-base font-bold text-slate-800">
              Bác sĩ tiêu biểu
            </Text>
            <TouchableOpacity onPress={handleStartBooking}>
              <Text className="text-xs font-semibold text-sky-600">Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {loadingDoctors ? (
            <ActivityIndicator size="small" color="#0284c7" className="py-8" />
          ) : doctors.length === 0 ? (
            <Text className="text-slate-400 text-sm text-center py-6">
              Không có dữ liệu bác sĩ
            </Text>
          ) : (
            doctors.slice(0, 6).map((doc) => (
              <DoctorCard
                key={doc.id}
                doctor={doc}
                onSelect={() => handleSelectDoctor(doc)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </ScreenShell>
  )
}
