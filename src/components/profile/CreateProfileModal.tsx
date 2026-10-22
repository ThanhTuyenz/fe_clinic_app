import React, { useState, useEffect, useMemo } from 'react'
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import { Calendar, LocaleConfig } from 'react-native-calendars'
import { formatDateVi, getTodayDateString, normalizeBirthDate } from '../../utils/date'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Input, Button, CccdScannerModal } from '../common'
import { ParsedCccd } from '../../utils/cccdParser'
import { getNativeCameraModule } from '../common/NativeCccdCamera'
import {
  patientProfileService,
  PatientProfile,
  CreatePatientProfilePayload,
} from '../../services/patientProfileService'

LocaleConfig.locales.vi ??= {
  monthNames: Array.from({ length: 12 }, (_, i) => `Tháng ${i + 1}`),
  monthNamesShort: Array.from({ length: 12 }, (_, i) => `Th${i + 1}`),
  dayNames: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
  dayNamesShort: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
  today: 'Hôm nay',
}
LocaleConfig.defaultLocale = 'vi'

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
  const insets = useSafeAreaInsets()
  const [showScanner, setShowScanner] = useState(false)
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false)
  const [showBirthYears, setShowBirthYears] = useState(false)
  const [birthCalendarMonth, setBirthCalendarMonth] = useState(getTodayDateString)
  const today = getTodayDateString()
  const birthYears = useMemo(() => Array.from({ length: Number(today.slice(0, 4)) },
    (_, index) => Number(today.slice(0, 4)) - index), [today])
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
      setShowBirthDatePicker(false)
      setShowBirthYears(false)
      // Load the module while the form is open; camera access starts only after tapping scan.
      if (Platform.OS !== 'web') getNativeCameraModule()
      if (initialData) {
        const fullAddr =
          initialData.address?.trim() ||
          [
            initialData.streetAddress,
            initialData.wardName,
            initialData.districtName,
            initialData.provinceName,
          ]
            .filter(Boolean)
            .join(', ') ||
          ''

        const dob = normalizeBirthDate(initialData.dateOfBirth || '') || ''

        setForm({
          fullName: initialData.fullName || '',
          phoneNumber: initialData.phoneNumber || defaultPhone,
          dateOfBirth: dob,
          gender: (initialData.gender as any) || 'MALE',
          nationalId: initialData.identityCardNumber || initialData.nationalId || '',
          healthInsuranceNumber: initialData.healthInsuranceNumber || '',
          relationshipToAccount:
            initialData.relationshipToAccount ||
            (initialData.id === 'self' || initialData.isMainProfile ? 'SELF' : 'OTHER'),
          address: fullAddr,
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
      dateOfBirth: normalizeBirthDate(parsed.dateOfBirth) || '',
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
    if (!normalizeBirthDate(form.dateOfBirth)) {
      Alert.alert('Ngày sinh không hợp lệ', 'Vui lòng chọn ngày sinh bệnh nhân từ lịch.')
      return
    }

    try {
      setIsSubmitting(true)
      let res: PatientProfile
      if (initialData?.id && initialData.id !== 'self') {
        res = await patientProfileService.updatePatientProfile(String(initialData.id), form)
        Alert.alert('Thành công', `Đã cập nhật thông tin cho ${res.fullName}.`)
      } else {
        const payload: CreatePatientProfilePayload = {
          ...form,
          isMainProfile:
            initialData?.id === 'self' ||
            initialData?.isMainProfile ||
            form.relationshipToAccount === 'SELF',
        }
        res = await patientProfileService.createPatientProfile(payload)
        Alert.alert(
          'Thành công',
          `Đã ${initialData?.id === 'self' ? 'cập nhật' : 'tạo'} hồ sơ cho ${res.fullName}.`
        )
      }
      onSuccess(res)
      onClose()
    } catch (err: any) {
      Alert.alert(
        initialData?.id && initialData.id !== 'self' ? 'Cập nhật thất bại' : 'Lưu hồ sơ thất bại',
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
          <View
            className="bg-white rounded-t-2xl max-h-[92%] flex-col overflow-hidden"
            style={{ paddingBottom: insets.bottom }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <Text className="text-base font-bold text-slate-900">
                {showBirthDatePicker ? 'Chọn ngày sinh' : initialData ? 'Xem chi tiết & Cập nhật hồ sơ' : 'Thêm hồ sơ bệnh nhân mới'}
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

            {showBirthDatePicker && (
              <View className="px-4 pb-4">
                <TouchableOpacity
                  onPress={() => showBirthYears ? setShowBirthYears(false) : setShowBirthDatePicker(false)}
                  accessibilityRole="button"
                  className="flex-row items-center py-3"
                >
                  <Ionicons name="chevron-back" size={18} color="#047857" />
                  <Text className="text-sm text-emerald-700 ml-1">
                    {showBirthYears ? 'Quay lại lịch' : 'Quay lại hồ sơ'}
                  </Text>
                </TouchableOpacity>
                {showBirthYears ? (
                  <FlatList
                    style={{ height: 320 }}
                    data={birthYears}
                    numColumns={4}
                    keyExtractor={year => String(year)}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item: year }) => (
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={`Chọn năm ${year}`}
                        onPress={() => {
                          setBirthCalendarMonth(`${String(year).padStart(4, '0')}-${birthCalendarMonth.slice(5, 7)}-01`)
                          setShowBirthYears(false)
                        }}
                        className={`flex-1 m-1 py-3 rounded-lg items-center ${Number(birthCalendarMonth.slice(0, 4)) === year ? 'bg-emerald-600' : 'bg-slate-50'}`}
                      >
                        <Text className={Number(birthCalendarMonth.slice(0, 4)) === year ? 'text-white font-semibold' : 'text-slate-700'}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <>
                    <Text className="text-xs text-slate-500 text-center mb-1">Nhấn vào tháng/năm để chọn nhanh năm sinh</Text>
                    <Calendar
                      key={birthCalendarMonth}
                      current={birthCalendarMonth}
                      maxDate={today}
                      firstDay={1}
                      disableAllTouchEventsForDisabledDays
                      onMonthChange={month => setBirthCalendarMonth(month.dateString)}
                      renderHeader={() => (
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel="Chọn năm sinh"
                          onPress={() => setShowBirthYears(true)}
                          className="flex-row items-center px-3 py-2"
                        >
                          <Text className="text-base font-bold text-slate-800">
                            Tháng {Number(birthCalendarMonth.slice(5, 7))} / {birthCalendarMonth.slice(0, 4)}
                          </Text>
                          <Ionicons name="chevron-down" size={16} color="#047857" style={{ marginLeft: 6 }} />
                        </TouchableOpacity>
                      )}
                      markedDates={form.dateOfBirth ? {
                        [form.dateOfBirth]: { selected: true, selectedColor: '#059669' },
                      } : {}}
                      onDayPress={day => {
                        const dateOfBirth = normalizeBirthDate(day.dateString)
                        if (!dateOfBirth) return
                        setForm(previous => ({ ...previous, dateOfBirth }))
                        setShowBirthDatePicker(false)
                      }}
                      theme={{ arrowColor: '#059669', todayTextColor: '#059669', selectedDayBackgroundColor: '#059669' }}
                    />
                  </>
                )}
              </View>
            )}

            <ScrollView
              style={{ flexShrink: 1, display: showBirthDatePicker ? 'none' : 'flex' }}
              contentContainerStyle={{ padding: 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Quick Scan CCCD Banner */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowScanner(true)}
                className="flex-row items-center justify-between bg-white border border-slate-200/90 rounded-lg px-3.5 py-3 mb-4"
                style={{ outline: 'none' } as any}
              >
                <View className="flex-row items-center flex-1 pr-2">
                  <Ionicons name="qr-code-outline" size={22} color="#2563eb" style={{ marginRight: 10 }} />
                  <Text className="text-xs font-bold text-slate-800">
                    Quét mã QR trên CCCD
                  </Text>
                </View>
                <View className="border border-blue-600 bg-white px-3 py-1.5 rounded">
                  <Text className="text-xs font-bold text-blue-600">Quét ngay</Text>
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
                  <Text className="text-xs font-semibold text-slate-700 mb-1.5">Ngày sinh *</Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Chọn ngày sinh"
                    disabled={isSubmitting}
                    onPress={() => {
                      Keyboard.dismiss()
                      setBirthCalendarMonth(normalizeBirthDate(form.dateOfBirth) || today)
                      setShowBirthYears(false)
                      setShowBirthDatePicker(true)
                    }}
                    className="flex-row items-center justify-between border border-slate-200 rounded-lg px-3.5 h-[46px] bg-slate-50/60 mb-3.5"
                  >
                    <Text className={form.dateOfBirth ? 'text-sm text-slate-800' : 'text-sm text-slate-400'}>
                      {form.dateOfBirth ? formatDateVi(form.dateOfBirth) : 'Chọn ngày sinh'}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>

                {/* Giới tính */}
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-slate-700 mb-1.5">Giới tính *</Text>
                  <View className="flex-row border border-slate-200 rounded-lg overflow-hidden h-[46px] bg-white">
                    <TouchableOpacity
                      onPress={() => setForm((p) => ({ ...p, gender: 'MALE' }))}
                      className={`flex-1 items-center justify-center ${
                        form.gender === 'MALE' ? 'bg-slate-900' : 'bg-white'
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
                        form.gender === 'FEMALE' ? 'bg-slate-900' : 'bg-white'
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
                            ? 'bg-slate-900 border-slate-900'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-xs ${
                            isSelected ? 'text-white font-bold' : 'text-slate-600 font-medium'
                          }`}
                        >
                          {rel.label}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

            </ScrollView>

            {/* Keep actions above the Android navigation bar while the form scrolls. */}
            <View className="flex-row gap-3 px-5 py-3 border-t border-slate-100 bg-white" style={{ display: showBirthDatePicker ? 'none' : 'flex' }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onClose}
                className="flex-1 py-3 rounded-lg border border-slate-200 items-center justify-center bg-white"
              >
                <Text className="text-xs font-semibold text-slate-700">Hủy</Text>
              </TouchableOpacity>

              <Button
                title={initialData?.id ? 'Lưu thay đổi' : 'Lưu hồ sơ bệnh nhân'}
                singleLine
                onPress={handleSubmit}
                isLoading={isSubmitting}
                className="py-3 rounded-lg"
                style={{ flex: 2 }}
              />
            </View>
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
