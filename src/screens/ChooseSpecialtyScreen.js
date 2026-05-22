import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Ionicons from '@expo/vector-icons/Ionicons'
import { listSpecialties } from '../api/specialties.js'
import { formatDateVi } from '../lib/user.js'
import { colors } from '../theme/colors.js'

export default function ChooseSpecialtyScreen({ navigation, route }) {
  const insets = useSafeAreaInsets()
  const selectedDate = useMemo(() => {
    const s = String(route.params?.selectedDate || '').trim().slice(0, 10)
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
  }, [route.params?.selectedDate])

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => String(r.name || '').toLowerCase().includes(q))
  }, [rows, search])

  useFocusEffect(
    useCallback(() => {
      let cancelled = false
      setLoading(true)
      setError('')
      listSpecialties()
        .then((specs) => {
          if (cancelled) return
          const list = Array.isArray(specs) ? [...specs] : []
          list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'))
          setRows(list)
        })
        .catch((e) => {
          if (!cancelled) setError(e.message || 'Không tải được chuyên khoa.')
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }, []),
  )

  function goNext(specialtyFilterKey) {
    if (selectedDate) {
      navigation.navigate('ChooseDoctor', { selectedDate, specialtyFilterKey })
    } else {
      navigation.navigate('ChooseAppointmentDate', { specialtyFirst: true, specialtyFilterKey })
    }
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.headerIcon}>
          <Ionicons name="chevron-back" size={26} color={colors.brandBlue} />
        </Pressable>
        <Text style={styles.headerTitle}>Chọn chuyên khoa</Text>
        <Pressable onPress={() => navigation.navigate('MainTabs')} hitSlop={12} style={styles.headerIcon}>
          <Ionicons name="home-outline" size={24} color={colors.brandBlue} />
        </Pressable>
      </View>

      {selectedDate ? (
        <View style={styles.banner}>
          <Ionicons name="calendar-outline" size={18} color={colors.brandBlue} />
          <Text style={styles.bannerText}>Ngày khám: {formatDateVi(selectedDate)}</Text>
        </View>
      ) : (
        <View style={[styles.banner, styles.bannerNext]}>
          <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.brandBlue} />
          <Text style={styles.bannerText}>Tiếp theo: chọn ngày khám, rồi chọn bác sĩ.</Text>
        </View>
      )}

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Tìm chuyên khoa…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={colors.brandBlue} size="large" />
          <Text style={styles.loadingText}>Đang tải chuyên khoa…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            search.trim() ? (
              <Text style={styles.emptyInline}>Không có chuyên khoa phù hợp. Thử từ khóa khác.</Text>
            ) : null
          }
          ListHeaderComponent={
            <Pressable
              style={({ pressed }) => [styles.row, styles.rowAll, pressed && styles.rowPressed]}
              onPress={() => goNext('')}
            >
              <Ionicons name="apps-outline" size={22} color={colors.brandBlue} />
              <Text style={styles.rowLabel}>Tất cả chuyên khoa</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => goNext(`id:${item.id}`)}
            >
              <Ionicons name="fitness-outline" size={22} color={colors.brandBlue} />
              <Text style={styles.rowLabel} numberOfLines={2}>
                {item.name || '—'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.pageCanvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.brandBlue,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.brandBlueSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerNext: {
    backgroundColor: colors.surface,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 15,
    color: colors.text,
  },
  errorBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    color: colors.danger,
    fontSize: 14,
  },
  loadingBox: {
    paddingTop: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 0,
    flexGrow: 1,
  },
  emptyInline: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowAll: {
    marginBottom: 14,
    borderColor: colors.brandBlue,
    borderWidth: 1.5,
  },
  rowPressed: {
    opacity: 0.92,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
})
