export function formatAppointmentDateKey(value) {

  if (!value) return ''

  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10)

  const d = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(d.getTime())) return ''

  const pad = (n) => String(n).padStart(2, '0')

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

}



export function getAppointmentDoctorId(appointment) {

  const raw =

    appointment?.doctor?.id ??

    appointment?.doctor?._id ??

    appointment?.doctor?.doctorId ??

    appointment?.doctorId ??

    appointment?.doctorID ??

    ''

  return String(raw || '').trim()

}



export function isAppointmentCancelled(appointment) {

  return String(appointment?.status || '').toLowerCase() === 'cancelled'

}



/** Params cho màn chọn ngày / chọn giờ (không còn dùng Appointment cũ cho luồng bác sĩ cố định). */

export function buildRebookParams(appointment) {

  const doctorId = getAppointmentDoctorId(appointment)

  const appointmentDate = formatAppointmentDateKey(appointment?.appointmentDate || appointment?.date)

  const out = {}

  if (doctorId) out.doctorId = doctorId

  if (appointmentDate) out.appointmentDate = appointmentDate

  return out

}



/** Đặt lại lịch: có sẵn ngày cũ → thẳng màn giờ; chỉ có bác sĩ → màn lịch. */

export function navigateDoctorBookingFromRebook(navigation, appointment) {

  const p = buildRebookParams(appointment)

  if (p.doctorId && p.appointmentDate) {

    navigation.navigate('ChooseAppointmentSlot', {

      doctorId: p.doctorId,

      appointmentDate: p.appointmentDate,

    })

  } else if (p.doctorId) {

    navigation.navigate('ChooseAppointmentDate', { doctorId: p.doctorId })

  } else {

    navigation.navigate('Appointment', { bookingMode: 'specialty' })

  }

}


/** Tái khám sau khi đã khám: luôn chọn ngày/giờ mới (không giữ ngày lần trước). */

export function navigateDoctorFollowUp(navigation, appointment) {

  const doctorId = getAppointmentDoctorId(appointment)

  if (!doctorId) {

    navigation.navigate('Appointment', { bookingMode: 'specialty' })

    return

  }

  const doc = appointment?.doctor

  const params = { doctorId }

  if (doc && typeof doc === 'object') params.doctor = doc

  navigation.navigate('ChooseAppointmentDate', params)

}

