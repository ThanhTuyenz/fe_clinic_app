import React from 'react'
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as ImagePicker from 'expo-image-picker'
import { Image } from 'expo-image'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  patientInfoSchema,
  PatientInfoFormValues,
} from '../../utils/validation'
import { Input } from '../common/Input'
import { Button } from '../common/Button'

interface PatientFormProps {
  initialValues?: Partial<PatientInfoFormValues>
  prescriptionImages: string[]
  onAddImage: (uri: string) => void
  onRemoveImage: (index: number) => void
  onSubmit: (values: PatientInfoFormValues) => void
  isLoading?: boolean
}

export const PatientForm: React.FC<PatientFormProps> = ({
  initialValues,
  prescriptionImages,
  onAddImage,
  onRemoveImage,
  onSubmit,
  isLoading = false,
}) => {
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PatientInfoFormValues>({
    resolver: zodResolver(patientInfoSchema),
    defaultValues: {
      patientType: initialValues?.patientType || 'self',
      patientName: initialValues?.patientName || '',
      patientPhone: initialValues?.patientPhone || '',
      patientDob: initialValues?.patientDob || '',
      patientGender: initialValues?.patientGender || 'male',
      patientCccd: initialValues?.patientCccd || '',
      symptoms: initialValues?.symptoms || '',
    },
  })

  const currentType = watch('patientType')
  const currentGender = watch('patientGender')

  const handlePickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permission.granted) {
        Alert.alert(
          'Quyền truy cập',
          'Vui lòng cấp quyền truy cập thư viện ảnh để tải lên hình ảnh đơn thuốc/triệu chứng.'
        )
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        onAddImage(result.assets[0].uri)
      }
    } catch (e) {
      console.warn('Lỗi chọn ảnh:', e)
    }
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      className="flex-1"
    >
      {/* 1. Chọn đối tượng khám */}
      <View className="bg-white p-4 rounded-lg border border-slate-100 mb-3.5 shadow-sm">
        <Text className="text-sm font-bold text-slate-800 mb-2.5">
          Đối tượng đặt khám
        </Text>
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => setValue('patientType', 'self')}
            className={`flex-1 py-2.5 rounded-lg border mr-2 items-center justify-center ${
              currentType === 'self'
                ? 'bg-emerald-50 border-emerald-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`font-semibold text-sm ${
                currentType === 'self' ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              👤 Cho bản thân
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setValue('patientType', 'relative')}
            className={`flex-1 py-2.5 rounded-lg border ml-2 items-center justify-center ${
              currentType === 'relative'
                ? 'bg-emerald-50 border-emerald-600'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`font-semibold text-sm ${
                currentType === 'relative' ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              👥 Cho người thân
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Thông tin bệnh nhân */}
      <View className="bg-white p-4 rounded-lg border border-slate-100 mb-3.5 shadow-sm">
        <Text className="text-sm font-bold text-slate-800 mb-2.5">
          Thông tin bệnh nhân
        </Text>

        <Controller
          control={control}
          name="patientName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Họ và tên bệnh nhân *"
              placeholder="VD: Nguyễn Văn A"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.patientName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="patientPhone"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Số điện thoại liên hệ *"
              placeholder="VD: 0912345678"
              keyboardType="phone-pad"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.patientPhone?.message}
            />
          )}
        />

        <View className="flex-row">
          <View className="flex-1 mr-2">
            <Controller
              control={control}
              name="patientDob"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Ngày sinh (DD/MM/YYYY) *"
                  placeholder="01/01/1990"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.patientDob?.message}
                />
              )}
            />
          </View>
          <View className="flex-1 ml-2">
            <Controller
              control={control}
              name="patientCccd"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Số CCCD / BHYT (Tùy chọn)"
                  placeholder="12 chữ số"
                  keyboardType="numeric"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />
          </View>
        </View>

        {/* Giới tính */}
        <Text className="text-sm font-medium text-slate-700 mb-1.5">
          Giới tính *
        </Text>
        <View className="flex-row mb-3.5">
          {(['male', 'female', 'other'] as const).map((gender) => {
            const isSelected = currentGender === gender
            const label =
              gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : 'Khác'
            return (
              <TouchableOpacity
                key={gender}
                onPress={() => setValue('patientGender', gender)}
                className={`flex-1 py-2 rounded-lg border mr-2 items-center justify-center ${
                  isSelected
                    ? 'bg-emerald-50 border-emerald-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    isSelected ? 'text-emerald-700' : 'text-slate-600'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      </View>

      {/* 3. Lý do khám & Triệu chứng */}
      <View className="bg-white p-4 rounded-lg border border-slate-100 mb-3.5 shadow-sm">
        <Text className="text-sm font-bold text-slate-800 mb-2.5">
          Triệu chứng & Lý do khám *
        </Text>
        <Controller
          control={control}
          name="symptoms"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <TextInput
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder="Mô tả triệu chứng bệnh, tiền sử bệnh án hoặc thuốc đang dùng..."
                placeholderTextColor="#94a3b8"
                className="border border-slate-200 rounded-lg p-3.5 text-slate-800 text-sm bg-slate-50 min-h-[90px] outline-none"
                style={{ outlineStyle: 'none' as any }}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
              {errors.symptoms && (
                <Text className="text-xs text-red-500 mt-1 ml-1">
                  {errors.symptoms.message}
                </Text>
              )}
            </View>
          )}
        />

        {/* 4. Tải ảnh đơn thuốc / hồ sơ bệnh án */}
        <Text className="text-sm font-bold text-slate-800 mt-4 mb-2">
          Ảnh đơn thuốc cũ / Kết quả xét nghiệm (nếu có)
        </Text>
        <View className="flex-row flex-wrap items-center">
          {prescriptionImages.map((uri, idx) => (
            <View key={idx} className="relative w-20 h-20 mr-2.5 mb-2.5 rounded-lg overflow-hidden border border-slate-200">
              <Image source={{ uri }} className="w-full h-full" contentFit="cover" />
              <TouchableOpacity
                onPress={() => onRemoveImage(idx)}
                className="absolute top-1 right-1 bg-black/60 rounded-full w-5 h-5 items-center justify-center"
              >
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={handlePickImage}
            className="w-20 h-20 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/50 items-center justify-center mr-2.5 mb-2.5"
          >
            <Ionicons name="camera-outline" size={24} color="#059669" />
            <Text className="text-[10px] font-semibold text-emerald-700 mt-1">
              Thêm ảnh
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Nút gửi */}
      <Button
        title="Xác nhận & Hoàn tất đặt khám"
        size="lg"
        isLoading={isLoading}
        onPress={handleSubmit(onSubmit)}
        className="mb-8"
      />
    </ScrollView>
  )
}
