import React from 'react'
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

export interface SelectInputProps {
  label?: string
  placeholder?: string
  value?: string
  sublabel?: string
  leftIcon?: keyof typeof Ionicons.glyphMap | React.ReactNode
  error?: string
  disabled?: boolean
  required?: boolean
  loading?: boolean
  onPress?: () => void
  onClear?: () => void
  containerClassName?: string
  style?: ViewStyle
}

export const SelectInput: React.FC<SelectInputProps> = ({
  label,
  placeholder = 'Chọn một mục...',
  value,
  sublabel,
  leftIcon,
  error,
  disabled = false,
  required = false,
  loading = false,
  onPress,
  onClear,
  containerClassName = '',
  style,
}) => {
  const hasValue = Boolean(value && String(value).trim())

  return (
    <View className={`w-full mb-[18px] ${containerClassName}`} style={style}>
      {label && (
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-xs font-semibold text-slate-700">
            {label} {required && <Text className="text-rose-600 font-bold">*</Text>}
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.75}
        disabled={disabled || loading}
        onPress={onPress}
        className={`flex-row items-center border rounded-lg px-3.5 py-3 ${
          disabled
            ? 'bg-slate-50 border-slate-200 opacity-60'
            : error
              ? 'border-rose-400 bg-white'
              : hasValue
                ? 'border-slate-300 bg-white'
                : 'border-slate-200 bg-white'
        }`}
      >
        {/* Left Icon */}
        {leftIcon && (
          <View className="mr-2.5">
            {typeof leftIcon === 'string' ? (
              <Ionicons
                name={leftIcon as any}
                size={19}
                color={hasValue ? '#059669' : '#64748b'}
              />
            ) : (
              leftIcon
            )}
          </View>
        )}

        {/* Content area */}
        <View className="flex-1 justify-center py-0.5">
          {hasValue ? (
            <>
              <Text
                numberOfLines={1}
                className="text-sm font-semibold text-slate-900 leading-tight"
              >
                {value}
              </Text>
              {sublabel ? (
                <Text
                  numberOfLines={1}
                  className="text-xs text-slate-500 mt-0.5 leading-tight"
                >
                  {sublabel}
                </Text>
              ) : null}
            </>
          ) : (
            <Text numberOfLines={1} className="text-sm text-slate-400">
              {placeholder}
            </Text>
          )}
        </View>

        {/* Right Action */}
        <View className="ml-2 flex-row items-center">
          {loading ? (
            <ActivityIndicator size="small" color="#059669" />
          ) : hasValue && onClear && !disabled ? (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={(e) => {
                e.stopPropagation?.()
                onClear()
              }}
              className="p-1 rounded-full active:bg-slate-200"
            >
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : (
            <Ionicons
              name="chevron-down"
              size={18}
              color={disabled ? '#cbd5e1' : '#64748b'}
            />
          )}
        </View>
      </TouchableOpacity>

      {error ? (
        <Text className="text-xs text-rose-600 mt-1 ml-0.5 font-medium">{error}</Text>
      ) : null}
    </View>
  )
}
