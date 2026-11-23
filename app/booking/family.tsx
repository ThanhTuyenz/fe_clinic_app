import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../src/store/useAuthStore'
import { ScreenShell } from '../../src/components/common/ScreenShell'
import { Button } from '../../src/components/common/Button'
import { SelectInput } from '../../src/components/common/SelectInput'
import { SelectModal } from '../../src/components/common/SelectModal'
import { MedicalCalendar } from '../../src/components/booking/MedicalCalendar'
import { CreateProfileModal } from '../../src/components/profile/CreateProfileModal'
import { PayosDeepLinkModal } from '../../src/components/booking/PayosDeepLinkModal'
import { appointmentService, CheckoutPayload, FamilyCheckoutResult } from '../../src/services/appointmentService'
import { bookingService } from '../../src/services/bookingService'
import { patientProfileService } from '../../src/services/patientProfileService'
import { paymentService, PayosCreatePaymentResponse } from '../../src/services/paymentService'
import { searchAnalytics } from '../../src/services/searchAnalytics'
import { formatCurrencyVi } from '../../src/utils/date'

type Member = { profileId: string; service?: any; slot?: { id: string; label: string } }
type Held = { accountId: string; order: FamilyCheckoutResult }

export default function FamilyBookingScreen() {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuthStore()
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.id)) router.replace({ pathname: '/(auth)/login', params: { redirect: '/booking/family' } })
  }, [isLoading, isAuthenticated, user?.id, router])
  if (isLoading || !isAuthenticated || !user?.id) return <ScreenShell title="Đặt khám gia đình"><Text className="p-5 text-slate-500">Vui lòng đăng nhập để đặt khám cho gia đình.</Text></ScreenShell>
  return <FamilyBookingForm key={String(user.id)} />
}

function FamilyBookingForm() {
  const router = useRouter()
  const client = useQueryClient()
  const accountId = useAuthStore(state => String(state.user?.id || ''))
  const key = `vitacare_family_hold:${accountId}`
  const [branchId, setBranchId] = useState('')
  const [date, setDate] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  const [voucher, setVoucher] = useState('')
  const [createProfile, setCreateProfile] = useState(false)
  const [modal, setModal] = useState<{ type: 'branch' | 'service' | 'slot'; profileId?: string } | null>(null)
  const [held, setHeld] = useState<Held | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [restoreError, setRestoreError] = useState(false)
  const [restoreVersion, setRestoreVersion] = useState(0)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const heldRef = useRef<Held | null>(null)
  const [payment, setPayment] = useState<PayosCreatePaymentResponse | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    setRestoring(true); setRestoreError(false)
    AsyncStorage.getItem(key).then(raw => {
      if (!raw || !active) return
      const saved: Held = JSON.parse(raw)
      if (saved.accountId === accountId && new Date(saved.order.holdExpiresAt).getTime() > Date.now()) {
        heldRef.current = saved
        setHeld(saved)
      } else void AsyncStorage.removeItem(key)
    }).catch(() => { if (active) { setRestoreError(true); setError('Không đọc được đơn đang giữ chỗ. Vui lòng kiểm tra Lịch khám trước khi đặt lại.') } })
      .finally(() => { if (active) setRestoring(false) })
    return () => { active = false }
  }, [key, accountId, restoreVersion])
  const profiles = useQuery({ queryKey: ['patientProfiles', accountId], queryFn: () => patientProfileService.getPatientProfiles() })
  const init = useQuery({ queryKey: ['family-init', branchId], queryFn: async () => {
    const flows = await Promise.all((['specialty', 'health-package', 'after-hours'] as const).map(flow => bookingService.getBookingInit({ flow, branchId: branchId || undefined })))
    return { branches: flows[0].branches, services: flows.flatMap((data, index) => [...(data.services || []), ...(data.healthPackages || [])].map(service => ({ ...service, bookingMethodCode: service.bookingMethod?.code || ['SPECIALTY_EXAM', 'HEALTH_PACKAGE', 'AFTER_HOURS'][index] }))) }
  } })
  const member = members.find(item => item.profileId === modal?.profileId)
  const slots = useQuery({ queryKey: ['family-slots', branchId, date, member?.service?.id, member?.service?.bookingMethodCode], queryFn: () => bookingService.getBookingSlots({ branchId, date, servicePackageId: member!.service.id, bookingMethodCode: member!.service.bookingMethodCode }), enabled: modal?.type === 'slot' && Boolean(branchId && date && member?.service?.id), staleTime: 0 })
  const services = [...new Map((init.data?.services || []).map(service => [`${service.id}:${service.bookingMethodCode}`, service])).values()]
  const updateMember = (profileId: string, patch: Partial<Member>) => setMembers(list => list.map(item => item.profileId === profileId ? { ...item, ...patch } : item))
  const checkout = async () => {
    if (busyRef.current || restoring || restoreError) return
    busyRef.current = true; setBusy(true); setError('')
    try {
      let existing = heldRef.current
      if (existing) {
        const status = await paymentService.checkPaymentStatus(existing.order.bookingOrderId)
        if (status.isPaid) {
          await AsyncStorage.removeItem(key)
          router.replace({ pathname: '/booking/family-result', params: { orderId: existing.order.bookingOrderId } })
          return
        }
      }
      if (!existing) {
        if (!branchId || !date || !members.length || members.some(item => !item.service || !item.slot)) throw new Error('Chọn cơ sở, ngày và đủ dịch vụ, khung giờ cho từng người.')
        const items: CheckoutPayload[] = await Promise.all(members.map(async item => ({
          ...await searchAnalytics.checkoutSource({ packageId: item.service.id, branchId }).catch(() => ({})),
          patientProfileId: item.profileId, bookingMethodCode: item.service.bookingMethodCode,
          servicePackageId: item.service.id, ...(item.service.bookingMethodCode === 'HEALTH_PACKAGE' ? { receptionSlotId: item.slot!.id } : { scheduleSlotId: item.slot!.id }),
        })))
        const order = await appointmentService.batchCheckout(items, voucher)
        existing = { accountId, order }; heldRef.current = existing; setHeld(existing)
        await AsyncStorage.setItem(key, JSON.stringify(existing))
      }
      if (Date.parse(existing.order.holdExpiresAt) <= Date.now()) throw new Error('Đơn đã hết thời gian giữ chỗ. Hủy đơn giữ chỗ để chọn lại lịch.')
      const info = await paymentService.createPayosPayment({ appointmentId: existing.order.bookingOrderId, amount: existing.order.totalAmount, description: 'KHAM GIA DINH' })
      setPayment(info); setShowPayment(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể đặt lịch. Vui lòng thử lại.') }
    finally { busyRef.current = false; setBusy(false) }
  }
  const release = async () => {
    if (busyRef.current || !heldRef.current) return
    busyRef.current = true; setBusy(true); setError('')
    try {
      // A successful payment may have arrived while the user closed the bank app.
      const status = await paymentService.checkPaymentStatus(heldRef.current.order.bookingOrderId)
      if (status.isPaid) { router.replace({ pathname: '/booking/family-result', params: { orderId: heldRef.current.order.bookingOrderId } }); return }
      const current = await appointmentService.getMyAppointments()
      const activeIds = new Set(current.filter(item => ['HOLD', 'PENDING', 'CONFIRMED'].includes(String(item.status).toUpperCase())).map(item => String(item.id)))
      await Promise.all(heldRef.current.order.appointments.filter(item => activeIds.has(item.appointmentId)).map(item => appointmentService.cancelAppointment(item.appointmentId, 'Không sắp xếp được thời gian')))
      await AsyncStorage.removeItem(key); heldRef.current = null; setHeld(null); setPayment(null)
      void client.invalidateQueries({ queryKey: ['myAppointments'] })
    } catch (e) { setError(e instanceof Error ? e.message : 'Không thể hủy đơn.') }
    finally { busyRef.current = false; setBusy(false) }
  }
  return <ScreenShell showBackButton title="Đặt khám gia đình">
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Text className="mb-4 text-sm text-slate-600">Chọn tối đa 5 người khám cùng ngày, cùng cơ sở. Mỗi người có dịch vụ và giờ khám riêng; thanh toán chung một đơn.</Text>
      {restoring ? <ActivityIndicator color="#28a745" /> : held ? <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Text className="font-bold text-slate-900">Đơn gia đình đang giữ chỗ</Text><Text className="mt-2 text-slate-600">{held.order.appointments.length} người • Tổng thanh toán: {formatCurrencyVi(held.order.totalAmount)}</Text>
        <Button title="Hủy đơn giữ chỗ để chọn lại" variant="outline" onPress={() => Alert.alert('Hủy đơn gia đình', 'Bạn muốn hủy các lịch đang giữ chỗ trong đơn này?', [{ text: 'Đóng', style: 'cancel' }, { text: 'Hủy đơn', style: 'destructive', onPress: () => { void release() } }])} disabled={busy} className="mt-3" />
      </View> : <>
        <SelectInput label="Cơ sở khám chung" value={init.data?.branches.find(branch => branch.id === branchId)?.name} onPress={() => setModal({ type: 'branch' })} loading={init.isLoading} />
        {init.isError && <Button title="Tải lại cơ sở và dịch vụ" variant="outline" onPress={() => { void init.refetch() }} />}
        <Text className="mb-2 font-semibold text-slate-700">Ngày khám chung</Text>
        <MedicalCalendar selectedDate={date} onSelectDate={value => { setDate(value); setMembers(list => list.map(item => ({ ...item, slot: undefined }))) }} />
        <View className="mb-3 flex-row items-center justify-between"><Text className="font-semibold text-slate-900">Người khám ({members.length}/5)</Text><TouchableOpacity onPress={() => setCreateProfile(true)}><Text className="text-primary-700">Thêm hồ sơ</Text></TouchableOpacity></View>
        {profiles.isLoading && <ActivityIndicator color="#28a745" />}
        {profiles.isError && <Button title="Tải lại hồ sơ" onPress={() => { void profiles.refetch() }} />}
        {profiles.data?.length === 0 && <Text className="mb-3 text-slate-500">Bạn chưa có hồ sơ. Thêm hồ sơ cho người khám trước.</Text>}
        {profiles.data?.map(profile => { const selected = members.find(item => item.profileId === profile.id); return <View key={profile.id} className="mb-3 rounded-xl border border-slate-200 bg-white p-4">
          <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: Boolean(selected) }} onPress={() => { if (selected) setMembers(list => list.filter(item => item.profileId !== profile.id)); else if (members.length < 5) setMembers(list => [...list, { profileId: profile.id }]); else Alert.alert('Tối đa 5 người', 'Vui lòng bỏ chọn một người trước.') }}><Text className="font-semibold text-slate-900">{selected ? '☑' : '☐'} {profile.fullName}</Text></TouchableOpacity>
          {selected && <View className="mt-3"><SelectInput label="Dịch vụ khám" value={selected.service?.name} disabled={!branchId} onPress={() => setModal({ type: 'service', profileId: profile.id })} /><SelectInput label="Giờ khám và bác sĩ" value={selected.slot?.label} disabled={!date || !selected.service} onPress={() => setModal({ type: 'slot', profileId: profile.id })} /></View>}
        </View> })}
        <TextInput value={voucher} onChangeText={setVoucher} placeholder="Mã ưu đãi (nếu có)" autoCapitalize="characters" className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3" />
        <Text className="mb-4 text-sm text-slate-600">Tạm tính dịch vụ: {formatCurrencyVi(members.reduce((sum, item) => sum + Number(item.service?.price || 0), 0))}. Phí dịch vụ và ưu đãi được máy chủ tính khi giữ chỗ.</Text>
      </>}
      {error ? <Text accessibilityRole="alert" className="mb-3 text-rose-700">{error}</Text> : null}
      {restoreError && <Button title="Đọc lại đơn đang giữ chỗ" variant="outline" onPress={() => setRestoreVersion(value => value + 1)} />}
      <Button title={held ? 'Tiếp tục thanh toán đơn đang giữ chỗ' : 'Giữ chỗ và thanh toán cả gia đình'} isLoading={busy} disabled={restoreError || restoring || busy || (!held && (!members.length || !branchId || !date || members.some(item => !item.slot)))} onPress={() => { void checkout() }} />
    </ScrollView>
    <SelectModal visible={modal?.type === 'branch'} title="Chọn cơ sở khám" onClose={() => setModal(null)} options={(init.data?.branches || []).map(branch => ({ id: branch.id, title: branch.name, subtitle: branch.address }))} onSelect={option => { setBranchId(String(option.id)); setMembers(list => list.map(item => ({ profileId: item.profileId }))); setModal(null) }} />
    <SelectModal visible={modal?.type === 'service'} title="Chọn dịch vụ khám" onClose={() => setModal(null)} options={services.map(service => ({ id: `${service.id}:${service.bookingMethodCode}`, title: service.name, subtitle: `${formatCurrencyVi(Number(service.price))} • ${service.bookingMethodCode === 'AFTER_HOURS' ? 'Ngoài giờ' : service.bookingMethodCode === 'HEALTH_PACKAGE' ? 'Gói sức khỏe' : 'Chuyên khoa'}`, extra: service }))} onSelect={option => { if (modal?.profileId) updateMember(modal.profileId, { service: option.extra, slot: undefined }); setModal(null) }} />
    <SelectModal visible={modal?.type === 'slot'} title={member?.service?.bookingMethodCode === 'HEALTH_PACKAGE' ? 'Chọn giờ tiếp nhận' : 'Chọn giờ và bác sĩ'} loading={slots.isLoading} emptyText={slots.isError ? 'Không tải được lịch. Đóng và mở lại để thử lại.' : 'Ngày này không còn khung giờ. Vui lòng chọn ngày khác.'} onClose={() => setModal(null)} options={(slots.data?.slots || []).flatMap(slot => slot.receptionSlotId ? (!slot.isFull ? [{ id: slot.receptionSlotId, title: `${slot.startTime} – ${slot.endTime}`, subtitle: `Giờ tiếp nhận • Còn ${slot.remainingSlots} chỗ`, extra: { id: slot.receptionSlotId, label: `${slot.startTime} – ${slot.endTime}` } }] : []) : slot.doctors.filter(doc => !slot.isFull && doc.remainingSlots > 0).map(doc => ({ id: doc.slotId, title: `${slot.startTime} – ${slot.endTime}`, subtitle: `${doc.doctorName}${doc.roomName ? ` • ${doc.roomName}` : ''}`, extra: { id: doc.slotId, label: `${slot.startTime} • ${doc.doctorName}` } })))} onSelect={option => { if (modal?.profileId) updateMember(modal.profileId, { slot: option.extra }); setModal(null) }} />
    <CreateProfileModal visible={createProfile} onClose={() => setCreateProfile(false)} onSuccess={() => { setCreateProfile(false); void profiles.refetch() }} />
    <PayosDeepLinkModal visible={showPayment} onClose={() => setShowPayment(false)} appointmentId={held?.order.bookingOrderId || ''} paymentData={payment} onPaymentSuccess={() => {
      if (!held) return
      setShowPayment(false); void AsyncStorage.removeItem(key); void client.invalidateQueries({ queryKey: ['myAppointments'] })
      router.replace({ pathname: '/booking/family-result', params: { orderId: held.order.bookingOrderId } })
    }} />
  </ScreenShell>
}
