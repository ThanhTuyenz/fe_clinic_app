import React, { useState } from 'react'
import {
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native'
import Ionicons from '@expo/vector-icons/Ionicons'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  isPassword?: boolean
  containerClassName?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  isPassword = false,
  containerClassName = '',
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <View className={`w-full mb-3.5 ${containerClassName}`}>
      {label && (
        <Text className="text-sm font-medium text-slate-700 mb-1.5">{label}</Text>
      )}
      <View
        className={`flex-row items-center border rounded-xl px-3.5 bg-slate-50 ${
          error ? 'border-red-500 bg-red-50/20' : 'border-slate-200 focus:border-sky-500'
        }`}
      >
        {leftIcon && <View className="mr-2.5">{leftIcon}</View>}
        <TextInput
          className={`flex-1 py-3 text-slate-800 text-base ${className}`}
          placeholderTextColor="#94a3b8"
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize="none"
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="p-1"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text className="text-xs text-red-500 mt-1 ml-1">{error}</Text>}
    </View>
  )
}
