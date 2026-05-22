import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import DoctorAvatar from '../components/DoctorAvatar.js'
import { listSpecialties } from '../api/specialties.js'
import {
  buildSpecialtyIdLookup,
  deriveDoctorTitle,
  formatDoctorPriceVi,
  deriveSessions,
  doctorDeptLine,
  doctorSpecialtyLine,
  parseTrainingBullets,
} from '../lib/doctorProfileUi.js'
import { colors } from '../theme/colors.js'

function AccordionSection({ title, expanded, onToggle, children }) {
  return (
    <View style={styles.accWrap}>
      <Pressable style={styles.accHeader} onPress={onToggle}>
        <Text style={styles.accTitle}>{title}</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="#fff" />
      </Pressable>
      {expanded ? <View style={styles.accBody}>{children}</View> : null}
    </View>
  )
}

export default function DoctorInfoScreen({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const doctor = route.params?.doctor
  const [scheduleOpen, setScheduleOpen] = useState(true)
  const [trainingOpen, setTrainingOpen] = useState(true)
  const [specialties, setSpecialties] = useState([])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      listSpecialties()
        .then((rows) => {
          if (!cancelled) setSpecialties(Array.isArray(rows) ? rows : [])
        })
        .catch(() => {
          if (!cancelled) setSpecialties([])
        })
      return () => {
        cancelled = true
      }
    }, []),
  )

  const specLookup = useMemo(() => buildSpecialtyIdLookup(specialties), [specialties])

  const title = useMemo(() => deriveDoctorTitle(doctor), [doctor])
  const specUpper = useMemo(() => doctorSpecialtyLine(doctor, specLookup).toUpperCase(), [doctor, specLookup])
  const deptLine = useMemo(() => doctorDeptLine(doctor, specLookup), [doctor, specLookup])
  const sessions = useMemo(() => (doctor?.id ? deriveSessions(doctor.id) : []), [doctor])
  const trainingItems = useMemo(() => parseTrainingBullets(doctor || {}), [doctor])

  if (!doctor) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Text style={styles.fallbackText}>Không có dữ liệu bác sĩ.</Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.fallbackLink}>Quay lại</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandBlue} />
      <View style={[styles.hero, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </Pressable>
        <Text style={styles.heroTitle}>Thông tin bác sĩ</Text>
        <View style={styles.backPlaceholder} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.profileRow}>
            <DoctorAvatar doctor={doctor} size={88} style={styles.profileAvatar} />
            <View style={styles.profileRight}>
              <View style={styles.namePill}>
                <Text style={styles.namePillText} numberOfLines={2}>
                  {title}
                </Text>
              </View>
              <View style={styles.specRow}>
                <Ionicons name="pulse" size={16} color={colors.brandBlue} />
                <Text style={styles.specRowText} numberOfLines={3}>
                  {deptLine}
                </Text>
              </View>
              {formatDoctorPriceVi(doctor) ? (
                <View style={styles.priceRow}>
                  <Ionicons name="cash-outline" size={16} color={colors.primary} />
                  <Text style={styles.priceRowText}>Giá khám: {formatDoctorPriceVi(doctor)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <AccordionSection
          title="Lịch khám bệnh"
          expanded={scheduleOpen}
          onToggle={() => setScheduleOpen((v) => !v)}
        >
          <View style={styles.scheduleSub}>
            <View style={styles.bullet} />
            <Text style={styles.scheduleSubText}>{specUpper}</Text>
          </View>
          <View style={styles.slotRow}>
            {sessions.map((s) => (
              <View key={s.key} style={styles.slotChip}>
                <View style={styles.slotDot} />
                <Text style={styles.slotChipText}>{s.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.scheduleHint}>Lịch cụ thể theo ngày có thể khác — xem khi đặt lịch.</Text>
        </AccordionSection>

        <AccordionSection
          title="Quá trình đào tạo"
          expanded={trainingOpen}
          onToggle={() => setTrainingOpen((v) => !v)}
        >
          {trainingItems.length ? (
            trainingItems.map((line, i) => (
              <View key={String(i)} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>•</Text>
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>Chưa có thông tin đào tạo chi tiết.</Text>
          )}
        </AccordionSection>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pageCanvas,
  },
  hero: {
    backgroundColor: colors.brandBlue,
    paddingBottom: 14,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: { width: 44 },
  heroTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  profileCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.9)',
  },
  profileRow: {
    flexDirection: 'row',
    gap: 14,
  },
  profileAvatar: {
    borderRadius: 14,
  },
  profileRight: {
    flex: 1,
    minWidth: 0,
  },
  namePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brandBlueSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  namePillText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brandBlueDark,
    lineHeight: 20,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  specRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandBlue,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  priceRowText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary,
  },
  accWrap: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
  },
  accHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.brandBlue,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  accTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  accBody: {
    backgroundColor: colors.surface,
    padding: 16,
  },
  scheduleSub: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandBlue,
    marginTop: 6,
  },
  scheduleSubText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 20,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.pageCanvas,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  slotChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  scheduleHint: {
    marginTop: 12,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
  },
  bulletMark: {
    fontSize: 16,
    color: colors.brandBlue,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 22,
  },
  muted: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  fallbackText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 48,
  },
  fallbackLink: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: colors.brandBlue,
  },
})
