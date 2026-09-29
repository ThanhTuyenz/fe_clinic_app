import React from 'react'
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native'

interface ButtonProps extends TouchableOpacityProps {
  title: string
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-teal-600 active:bg-teal-700 text-white'
      case 'outline':
        return 'bg-transparent border border-emerald-600 active:bg-emerald-50'
      case 'danger':
        return 'bg-red-500 active:bg-red-600 text-white'
      case 'ghost':
        return 'bg-transparent active:bg-gray-100'
      case 'primary':
      default:
        return 'bg-emerald-600 active:bg-emerald-700 text-white'
    }
  }

  const getTextStyles = () => {
    switch (variant) {
      case 'outline':
        return 'text-emerald-700 font-semibold'
      case 'ghost':
        return 'text-gray-700 font-medium'
      default:
        return 'text-white font-semibold'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'py-2 px-3 rounded-lg text-sm'
      case 'lg':
        return 'py-3.5 px-6 rounded-lg text-base'
      case 'md':
      default:
        return 'py-3 px-4 rounded-lg text-base'
    }
  }

  const isDisabled = disabled || isLoading

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${getVariantStyles()} ${getSizeStyles()} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#059669' : '#ffffff'}
        />
      ) : (
        <View className="flex-row items-center justify-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={`text-center ${getTextStyles()}`}>{title}</Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  )
}
