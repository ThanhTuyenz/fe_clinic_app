import React from 'react'
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'
import {
  SemanticSearchResponse,
  SemanticSearchResultItem,
  SearchDoctorItem,
  SearchBranchItem,
} from '../../services/recommendationService'
import { formatCurrencyVi } from '../../utils/date'

export interface HomeSearchBarProps {
  value: string
  onChangeText: (text: string) => void
  onFilterPress?: () => void
  isLoading?: boolean
  searchResults?: SemanticSearchResponse | null
  showDropdown?: boolean
  onSelectPackage?: (pkg: SemanticSearchResultItem) => void
  onSelectDoctor?: (doc: SearchDoctorItem) => void
  onSelectBranch?: (branch: SearchBranchItem) => void
  onCloseDropdown?: () => void
}

const POPULAR_SUGGESTIONS = ['Đau đầu', 'Đau dạ dày', 'Tim mạch', 'Khám tổng quát', 'Nhi khoa']

export const HomeSearchBar: React.FC<HomeSearchBarProps> = ({
  value,
  onChangeText,
  onFilterPress,
  isLoading = false,
  searchResults,
  showDropdown = false,
  onSelectPackage,
  onSelectDoctor,
  onSelectBranch,
}) => {
  const hasResults =
    Boolean(
      (searchResults?.packages && searchResults.packages.length > 0) ||
      (searchResults?.doctors && searchResults.doctors.length > 0) ||
      (searchResults?.branches && searchResults.branches.length > 0)
    )

  return (
    <View className="bg-white px-4 pt-2 pb-3 border-b border-slate-100 z-30">
      {/* Search Input Bar */}
      <View className="flex-row items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3.5" style={{ minHeight: 52 }}>
        <Ionicons name="search-outline" size={20} color="#64748b" style={{ marginRight: 10 }} />
        <TextInput
          placeholder="Mô tả triệu chứng, tìm gói khám, bác sĩ..."
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          className="flex-1 text-sm text-slate-800 py-3 outline-none"
          style={[{ outlineWidth: 0, outlineStyle: 'none' } as any]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isLoading ? (
          <ActivityIndicator size="small" color="#64748b" style={{ marginRight: 4 }} />
        ) : null}

        {value ? (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close-circle" size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : onFilterPress ? (
          <TouchableOpacity onPress={onFilterPress}>
            <View className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center">
              <Ionicons name="filter-outline" size={18} color="#475569" />
            </View>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Clean AI Semantic Search Dropdown Panel (Flat, No Shadow) */}
      {showDropdown && value.trim().length >= 2 && (
        <View className="mt-2 bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* Header */}
          <View className="flex-row items-center justify-between px-3.5 py-2 bg-slate-50/80 border-b border-slate-100">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="sparkles-outline" size={13} color="#64748b" />
              <Text className="text-[11px] font-semibold text-slate-700 tracking-wide">
                Kết quả tìm kiếm gợi ý
              </Text>
            </View>
            {isLoading && (
              <Text className="text-[10px] text-slate-400 font-medium">Đang tìm...</Text>
            )}
          </View>

          {/* Loading State */}
          {isLoading && !hasResults ? (
            <View className="py-6 items-center justify-center">
              <ActivityIndicator size="small" color="#64748b" />
              <Text className="text-xs text-slate-500 mt-2">
                Đang tìm dịch vụ phù hợp với "{value.trim()}"...
              </Text>
            </View>
          ) : null}

          {/* Results List */}
          {hasResults ? (
            <View className="max-h-96">
              {/* 1. Gói khám phù hợp */}
              {searchResults?.packages && searchResults.packages.length > 0 && (
                <View className="p-1.5 border-b border-slate-100">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Gói khám ({searchResults.packages.length})
                  </Text>
                  {searchResults.packages.map((pkg) => (
                    <TouchableOpacity
                      key={pkg.id}
                      onPress={() => onSelectPackage?.(pkg)}
                      activeOpacity={0.7}
                      className="p-2 rounded-md hover:bg-slate-50 active:bg-slate-100 flex-row items-center justify-between border-b border-slate-50 last:border-0"
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-xs font-medium text-slate-800" numberOfLines={1}>
                          {pkg.name}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                          <Text className="text-[11px] text-slate-400">
                            {pkg.specialtyName || 'Đa khoa'}
                          </Text>
                          <Text className="text-[10px] text-slate-300">•</Text>
                          <Text className="text-[11px] font-semibold text-primary-700">
                            {formatCurrencyVi(pkg.price)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="#cbd5e1" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* 2. Bác sĩ liên quan */}
              {searchResults?.doctors && searchResults.doctors.length > 0 && (
                <View className="p-2 border-b border-slate-100">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Bác sĩ ({searchResults.doctors.length})
                  </Text>
                  {searchResults.doctors.map((doc) => (
                    <TouchableOpacity
                      key={doc.id}
                      onPress={() => onSelectDoctor?.(doc)}
                      activeOpacity={0.7}
                      className="p-2 rounded-lg hover:bg-slate-50 active:bg-slate-100 flex-row items-center justify-between border-b border-slate-50 last:border-0"
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-xs font-medium text-slate-800">
                          {doc.academicRank ? `${doc.academicRank} ` : ''}
                          {doc.fullName}
                        </Text>
                        <Text className="text-[11px] text-slate-400 mt-0.5" numberOfLines={1}>
                          {doc.specialties?.join(', ') || 'Bác sĩ chuyên khoa'}
                          {doc.experienceYears > 0 ? ` • ${doc.experienceYears} năm KN` : ''}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={13} color="#cbd5e1" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* 3. Cơ sở y tế */}
              {searchResults?.branches && searchResults.branches.length > 0 && (
                <View className="p-2">
                  <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                    Cơ sở ({searchResults.branches.length})
                  </Text>
                  {searchResults.branches.map((b) => (
                    <TouchableOpacity
                      key={b.id}
                      onPress={() => onSelectBranch?.(b)}
                      activeOpacity={0.7}
                      className="p-2 rounded-lg hover:bg-slate-50 active:bg-slate-100 flex-row items-center justify-between"
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-xs font-medium text-slate-800">{b.name}</Text>
                        <Text className="text-[10px] text-slate-400 mt-0.5" numberOfLines={1}>
                          {b.address}
                        </Text>
                      </View>
                      <Ionicons name="location-outline" size={13} color="#94a3b8" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : null}

          {/* Empty State */}
          {!isLoading && !hasResults ? (
            <View className="py-5 px-4 items-center">
              <Ionicons name="search-outline" size={22} color="#cbd5e1" />
              <Text className="text-xs font-medium text-slate-700 mt-2 text-center">
                Không tìm thấy kết quả phù hợp với "{value.trim()}"
              </Text>
              <Text className="text-[11px] text-slate-400 mt-1 text-center">
                Gợi ý tìm kiếm phổ biến:
              </Text>
              <View className="flex-row flex-wrap gap-1.5 justify-center mt-2.5">
                {POPULAR_SUGGESTIONS.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => onChangeText(tag)}
                    className="bg-slate-100 px-2 py-1 rounded active:bg-slate-200"
                  >
                    <Text className="text-[10px] text-slate-600 font-medium">{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </View>
  )
}
