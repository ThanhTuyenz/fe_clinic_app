import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Image } from 'expo-image'
import Ionicons from '@expo/vector-icons/Ionicons'

export interface SelectModalOption<T = any> {
  id: string | number
  title: string
  subtitle?: string
  avatar?: string
  badge?: string
  badgeColor?: string
  disabled?: boolean
  extra?: T
}

interface SelectModalProps<T = any> {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  searchPlaceholder?: string
  options: SelectModalOption<T>[]
  selectedId?: string | number
  onSelect: (option: SelectModalOption<T>) => void
  emptyText?: string
  loading?: boolean
}

export function SelectModal<T = any>({
  visible,
  onClose,
  title,
  subtitle,
  searchPlaceholder = 'Tìm kiếm nhanh...',
  options,
  selectedId,
  onSelect,
  emptyText = 'Không tìm thấy kết quả phù hợp',
  loading = false,
}: SelectModalProps<T>) {
  const [search, setSearch] = useState('')

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase().trim()
    return options.filter((item) => {
      const matchTitle = item.title?.toLowerCase().includes(q)
      const matchSubtitle = item.subtitle?.toLowerCase().includes(q)
      const matchBadge = item.badge?.toLowerCase().includes(q)
      return matchTitle || matchSubtitle || matchBadge
    })
  }, [options, search])

  const handleSelect = (item: SelectModalOption<T>) => {
    if (item.disabled) return
    onSelect(item)
    setSearch('')
    onClose()
  }

  const handleClose = () => {
    setSearch('')
    onClose()
  }

  const showSearch = options.length > 5

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <Pressable
        onPress={handleClose}
        className="flex-1 bg-slate-900/60 justify-end md:justify-center md:items-center p-0 md:p-6"
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          className="bg-white w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[82%] flex-col overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <View className="px-5 pt-4 pb-3 border-b border-slate-100 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={handleClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <Ionicons name="close" size={20} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Search Box if list is long */}
          {showSearch && (
            <View className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <View className="flex-row items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5">
                <Ionicons name="search-outline" size={17} color="#94a3b8" />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={searchPlaceholder}
                  placeholderTextColor="#94a3b8"
                  className="flex-1 ml-2 text-sm text-slate-800 py-1"
                  autoCapitalize="none"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
                {search.length > 0 && Platform.OS !== 'ios' && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Body Content */}
          {loading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="large" color="#28a745" />
              <Text className="text-xs text-slate-500 mt-2 font-medium">Đang tải dữ liệu...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingVertical: 6 }}
              renderItem={({ item }) => {
                const isSelected = selectedId !== undefined && String(selectedId) === String(item.id)

                return (
                  <TouchableOpacity
                    activeOpacity={item.disabled ? 1 : 0.65}
                    disabled={item.disabled}
                    onPress={() => handleSelect(item)}
                    className={`flex-row items-center px-4 py-3.5 border-b border-slate-100 transition-colors ${
                      item.disabled
                        ? 'opacity-40 bg-slate-50'
                        : isSelected
                          ? 'bg-slate-50/80'
                          : 'bg-white active:bg-slate-50'
                    }`}
                  >
                    {/* Avatar if exists */}
                    {item.avatar ? (
                      <Image
                        source={{ uri: item.avatar }}
                        style={{ width: 42, height: 42, borderRadius: 21, marginRight: 12 }}
                        contentFit="cover"
                      />
                    ) : null}

                    {/* Text info */}
                    <View className="flex-1 mr-3">
                      <View className="flex-row items-center flex-wrap gap-1.5 mb-0.5">
                        <Text
                          className={`text-sm ${
                            isSelected ? 'text-slate-900 font-bold' : 'text-slate-800 font-medium'
                          }`}
                        >
                          {item.title}
                        </Text>
                        {item.badge ? (
                          <View
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              item.badgeColor || 'bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <Text
                              className={`text-[10px] font-semibold ${
                                item.badgeColor ? 'text-slate-800' : 'text-slate-700'
                              }`}
                            >
                              {item.badge}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {item.subtitle ? (
                        <Text
                          className="text-xs text-slate-500 leading-relaxed"
                          numberOfLines={2}
                        >
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>

                    {/* Radio / Check indicator */}
                    <View className="ml-1">
                      {isSelected ? (
                        <View className="w-5 h-5 rounded-full bg-primary-600 items-center justify-center shadow-xs">
                          <Ionicons name="checkmark" size={13} color="#ffffff" />
                        </View>
                      ) : (
                        <View className="w-5 h-5 rounded-full border border-slate-300 bg-white" />
                      )}
                    </View>
                  </TouchableOpacity>
                )
              }}
              ListEmptyComponent={
                <View className="py-12 px-6 items-center justify-center">
                  <Ionicons name="folder-open-outline" size={36} color="#94a3b8" />
                  <Text className="text-sm font-semibold text-slate-600 mt-2 text-center">
                    {emptyText}
                  </Text>
                  <Text className="text-xs text-slate-400 mt-1 text-center">
                    Vui lòng chọn tiêu chí khác hoặc kiểm tra lại kết nối mạng.
                  </Text>
                </View>
              }
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}
