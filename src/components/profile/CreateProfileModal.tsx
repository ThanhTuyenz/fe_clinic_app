import React, { useState, useEffect } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Input, Button, CccdScannerModal } from '../common'
import { ParsedCccd } from '../../utils/cccdParser'
import {
  patientProfileService,
  PatientProfile,
  CreatePatientProfilePayload,
} from '../../services/patientProfileService'

interface CreateProfileModalProps {
  visible: boolean
  onClose: () => void
  onSuccess: (profile: PatientProfile) => void
  defaultPhone?: string
  initialData?: PatientProfile | null
}

export const CreateProfileModal: React.FC<CreateProfileModalProps> = ({
  visible,
  onClose,
  onSuccess,
  defaultPhone = '',
  initialData = null,
}) => {
  const [showScanner, setShowScanner] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState<CreatePatientProfilePayload>({
    fullName: '',
    phoneNumber: defaultPhone,
    dateOfBirth: '',
    gender: 'MALE',
    nationalId: '',
    healthInsuranceNumber: '',
    relationshipToAccount: 'OTHER',
    address: '',
  })

  useEffect(() => {
    if (visible) {
      if (initialData) {
        setForm({
          fullName: initialData.fullName || '',
          phoneNumber: initialData.phoneNumber || defaultPhone,
          dateOfBirth: initialData.dateOfBirth ? initialData.dateOfBirth.slice(0, 10) : '',
          gender: (initialData.gender as any) || 'MALE',
          nationalId: initialData.identityCardNumber || initialData.nationalId || '',
          healthInsuranceNumber: initialData.healthInsuranceNumber || '',
          relationshipToAccount: initialData.relationshipToAccount || 'OTHER',
          address: initialData.address || '',
        })
      } else {
        setForm({
          fullName: '',
          phoneNumber: defaultPhone,
          dateOfBirth: '',
          gender: 'MALE',
          nationalId: '',
          healthInsuranceNumber: '',
          relationshipToAccount: 'OTHER',
          address: '',
        })
      }
    }
  }, [visible, defaultPhone, initialData])

  const handleCccdScanned = (parsed: ParsedCccd) => {
    setForm((prev) => ({
      ...prev,
      fullName: parsed.fullName,
      nationalId: parsed.nationalId,
      dateOfBirth: parsed.dateOfBirth,
      gender: parsed.gender,
      address: parsed.address || prev.address,
    }))
  }

  const handleSubmit = async () => {
    if (!form.fullName.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập họ và tên bệnh nhân.')
      return
    }
    if (!form.phoneNumber?.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ.')
      return
    }
    if (!form.dateOfBirth?.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập ngày sinh bệnh nhân (YYYY-MM-DD).')
      return
    }

    try {
      setIsSubmitting(true)
      let res: PatientProfile
      if (initialData?.id) {
        res = await patientProfileService.updatePatientProfile(String(initialData.id), form)
        Alert.alert('Thành công', `Đã cập nhật thông tin cho ${res.fullName}.`)
      } else {
        res = await patientProfileService.createPatientProfile(form)
        Alert.alert('Thành công', `Đã tạo hồ sơ bệnh nhân cho ${res.fullName}.`)
      }
      onSuccess(res)
      onClose()
    } catch (err: any) {
      Alert.alert(
        initialData?.id ? 'Cập nhật thất bại' : 'Tạo hồ sơ thất bại',
        err.message || 'Không thể lưu hồ sơ. Vui lòng thử lại.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const RELATIONSHIPS = [
    { key: 'SELF', label: 'Bản thân' },
    { key: 'SPOUSE', label: 'Vợ/Chồng' },
    { key: 'CHILD', label: 'Con ruột' },
    { key: 'PARENT', label: 'Bố/Mẹ' },
    { key: 'OTHER', label: 'Người thân khác' },
  ]

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 bg-slate-900/60 justify-end"
        >
          <View className="bg-white rounded-t-2xl max-h-[92%] flex-col overflow-hidden">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <Text className="text-base font-bold text-slate-900">
                {initialData?.id ? 'Cập nhật thông tin hồ sơ' : 'Thêm hồ sơ bệnh nhân mới'}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                className="p-1 items-center justify-center ml-2"
                style={{ outline: 'none' } as any}
              >
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
              {/* Quick Scan CCCD Banner */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowScanner(true)}
                className="flex-row items-center justify-between bg-white border border-slate-200/90 rounded-lg px-3.5 py-3 mb-4"
                style={{ outline: 'none' } as any}
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <Ionicons name="qr-code-outline" size={22} color="#059669" style={{ marginRight: 10 }} />
                  <Text className="text-xs font-bold text-slate-800">
                    Quét mã QR trên CCCD gắn chip
                  </Text>
                </View>
                <View className="border border-emerald-600 bg-white px-3 py-1.5 rounded">
                  <Text className="text-xs font-bold text-emerald-700">Quét ngay</Text>
                </View>
              </TouchableOpacity>

              {/* Form Fields */}
              <Input
                label="Họ và tên bệnh nhân *"
                placeholder="Ví dụ: NGUYỄN VĂN AN"
                value={form.fullName}
                onChangeText={(val) => setForm((p) => ({ ...p, fullName: val }))}
              />

              <Input
                label="Số điện thoại liên hệ *"
                placeholder="Ví dụ: 0912345678"
                keyboardType="phone-pad"
                value={form.phoneNumber}
                onChangeText={(val) => setForm((p) => ({ ...p, phoneNumber: val }))}
              />

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Input
                    label="Ngày sinh (YYYY-MM-DD) *"
                    placeholder="2000-01-01"
                    value={form.dateOfBirth}
                    onChangeText={(val) => setForm((p) => ({ ...p, dateOfBirth: val }))}
                  />
                </View>

                {/* Giới tính */}
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-700 mb-1.5">Giới tính *</Text>
                  <View className="flex-row border border-slate-200 rounded-lg overflow-hidden h-[46px] bg-white">
                    <TouchableOpacity
                      onPress={() => setForm((p) => ({ ...p, gender: 'MALE' }))}
                      className={`flex-1 items-center justify-center ${
                        form.gender === 'MALE' ? 'bg-emerald-700' : 'bg-white'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          form.gender === 'MALE' ? 'text-white' : 'text-slate-600 font-medium'
                        }`}
                      >
                        Nam
                      </Text>
                    </TouchableOpacity>
                    <View className="w-[1px] bg-slate-200" />
                    <TouchableOpacity
                      onPress={() => setForm((p) => ({ ...p, gender: 'FEMALE' }))}
                      className={`flex-1 items-center justify-center ${
                        form.gender === 'FEMALE' ? 'bg-emerald-700' : 'bg-white'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          form.gender === 'FEMALE' ? 'text-white' : 'text-slate-600 font-medium'
                        }`}
                      >
                        Nữ
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <Input
                label="Số thẻ Căn cước công dân (12 số)"
                placeholder="001201012345"
                keyboardType="numeric"
                value={form.nationalId}
                onChangeText={(val) => setForm((p) => ({ ...p, nationalId: val }))}
              />

              <Input
                label="Mã thẻ BHYT (nếu có)"
                placeholder="DN4791234567890"
                value={form.healthInsuranceNumber}
                onChangeText={(val) => setForm((p) => ({ ...p, healthInsuranceNumber: val }))}
              />

              <Input
                label="Nơi thường trú / Địa chỉ"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                value={form.address}
                onChangeText={(val) => setForm((p) => ({ ...p, address: val }))}
              />

              {/* Quan hệ với tài khoản */}
              <View className="mb-6">
                <Text className="text-xs font-semibold text-slate-700 mb-2">
                  Mối quan hệ với chủ tài khoản
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {RELATIONSHIPS.map((rel) => {
                    const isSelected = form.relationshipToAccount === rel.key
                    return (
                      <TouchableOpacity
                        key={rel.key}
                        activeOpacity={0.7}
                        onPress={() => setForm((p) => ({ ...p, relationshipToAccount: rel.key }))}
                        className={`px-3 py-2 rounded-lg border ${
                          isSelected
                            ? 'bg-white border-emerald-600'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-xs ${
                            isSelected ? 'text-emerald-700 font-bold' : 'text-slate-600 font-medium'
                          }`}
                        >
                          {rel.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 pb-8">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={onClose}
                  className="flex-1 py-3 rounded-lg border border-slate-200 items-center justify-center bg-white"
                >
                  <Text className="text-xs font-semibold text-slate-700">Hủy</Text>
                </TouchableOpacity>

                <Button
                  title={initialData?.id ? 'Lưu thay đổi' : 'Lưu hồ sơ bệnh nhân'}
                  onPress={handleSubmit}
                  isLoading={isSubmitting}
                  className="flex-2 py-3 rounded-lg"
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sub-modal: Scanner */}
      <CccdScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onSuccess={handleCccdScanned}
      />
    </>
  )
}
