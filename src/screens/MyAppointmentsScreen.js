import { useCallback, useMemo, useState } from 'react'

import { StyleSheet, Text } from 'react-native'

import { useFocusEffect } from '@react-navigation/native'

import { cancelAppointment, listMyAppointments } from '../api/appointments.js'

import AppointmentStatusFilter from '../components/AppointmentStatusFilter.js'

import AppointmentTicketCard from '../components/AppointmentTicketCard.js'

import CancelAppointmentModal from '../components/CancelAppointmentModal.js'

import MessageBanner from '../components/MessageBanner.js'

import ScreenShell from '../components/ScreenShell.js'

import {
  getAppointmentDoctorId,
  isAppointmentCancelled,
  navigateDoctorBookingFromRebook,
  navigateDoctorFollowUp,
} from '../lib/appointmentRebook.js'
import { getAppointmentStatusKind } from '../lib/appointmentStatus.js'

import { getSession } from '../lib/session.js'

import { isPendingAppointmentPastSlot } from '../utils/appointmentExpiry.js'

import { colors } from '../theme/colors.js'



export default function MyAppointmentsScreen({ navigation }) {

  const [token, setToken] = useState('')

  const [sessionUser, setSessionUser] = useState(null)

  const [rows, setRows] = useState([])

  const [error, setError] = useState('')

  const [loading, setLoading] = useState(false)

  const [cancellingId, setCancellingId] = useState('')
  const [cancelTargetId, setCancelTargetId] = useState('')
  const [cancelModalError, setCancelModalError] = useState('')

  const [statusFilter, setStatusFilter] = useState('')



  const filteredRows = useMemo(() => {

    if (!statusFilter) return rows

    return rows.filter((row) => getAppointmentStatusKind(row?.status) === statusFilter)

  }, [rows, statusFilter])



  const loadRows = useCallback(async () => {

    setError('')

    const session = await getSession()

    if (!session.token) {

      navigation.navigate('Login', { message: 'Vui lòng đăng nhập để xem lịch khám.' })

      return

    }

    setToken(session.token)

    setSessionUser(session.user || null)

    setLoading(true)

    try {

      const data = await listMyAppointments({ token: session.token })

      setRows(Array.isArray(data) ? data : [])

    } catch (err) {

      setError(err.message || 'Không lấy được lịch khám.')

    } finally {

      setLoading(false)

    }

  }, [navigation])



  useFocusEffect(

    useCallback(() => {

      loadRows()

    }, [loadRows]),

  )



  function openCancelModal(appointmentId) {

    if (!token || !appointmentId) return

    setCancelModalError('')

    setCancelTargetId(appointmentId)

  }



  function closeCancelModal() {

    if (cancellingId) return

    setCancelTargetId('')

    setCancelModalError('')

  }



  async function confirmCancel(cancelReason) {

    const appointmentId = cancelTargetId

    if (!token || !appointmentId) return

    setCancellingId(appointmentId)

    setCancelModalError('')

    setError('')

    try {

      await cancelAppointment({ token, appointmentId, cancelReason })

      setCancelTargetId('')

      await loadRows()

    } catch (err) {

      setCancelModalError(err.message || 'Không hủy được lịch khám.')

    } finally {

      setCancellingId('')

    }

  }



  const openDetail = (appointmentId, appointment) => {

    navigation.navigate('AppointmentDetail', { appointmentId, appointment })

  }



  function handleRebook(appointment) {

    navigateDoctorBookingFromRebook(navigation, appointment)

  }

  function handleFollowUp(appointment) {

    navigateDoctorFollowUp(navigation, appointment)

  }



  return (

    <ScreenShell title="Lịch sử đặt khám" subtitle="Theo dõi và quản lý các lịch hẹn đã đặt.">

      <MessageBanner message={error} />

      {!loading && rows.length ? (

        <AppointmentStatusFilter value={statusFilter} onChange={setStatusFilter} count={filteredRows.length} countLabel="lịch" />

      ) : null}

      {loading ? <Text style={styles.muted}>Đang tải lịch khám…</Text> : null}

      {!loading && !rows.length ? <Text style={styles.muted}>Bạn chưa có lịch khám nào.</Text> : null}

      {!loading && rows.length && !filteredRows.length ? (

        <Text style={styles.muted}>Không có lịch phù hợp bộ lọc.</Text>

      ) : null}



      {filteredRows.map((row) => {

        const id = row.id || row._id

        const expired = isPendingAppointmentPastSlot(row)

        const canCancel = String(row.status || '').toLowerCase() === 'pending' && !expired

        const cancelled = isAppointmentCancelled(row)

        const statusKind = getAppointmentStatusKind(row?.status)

        const canFollowUp = statusKind === 'done' && Boolean(getAppointmentDoctorId(row))

        return (

          <AppointmentTicketCard

            key={id}

            appointment={row}

            sessionUser={sessionUser}

            onOpenDetail={openDetail}

            pressable={false}

            showFooterActions

            canCancel={canCancel}

            onCancel={() => openCancelModal(id)}

            onRebook={cancelled ? () => handleRebook(row) : undefined}

            onFollowUp={canFollowUp ? () => handleFollowUp(row) : undefined}

            cancelling={cancellingId === id}

          />

        )

      })}

      <CancelAppointmentModal

        visible={Boolean(cancelTargetId)}

        loading={Boolean(cancellingId)}

        error={cancelModalError}

        onClose={closeCancelModal}

        onConfirm={confirmCancel}

      />

    </ScreenShell>

  )

}



const styles = StyleSheet.create({

  muted: {

    color: colors.textMuted,

    marginBottom: 12,

  },

})


