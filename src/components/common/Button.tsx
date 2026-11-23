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
  singleLine?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  singleLine = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  accessibilityState,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-primary-600 active:bg-primary-700 text-white'
      case 'outline':
        return 'bg-transparent border border-primary-600 active:bg-primary-50'
      case 'danger':
        return 'bg-red-500 active:bg-red-600 text-white'
      case 'ghost':
        return 'bg-transparent active:bg-gray-100'
      case 'primary':
      default:
        return 'bg-primary-600 active:bg-primary-700 text-white'
    }
  }

  const getTextStyles = () => {
    switch (variant) {
      case 'outline':
        return 'text-primary-700 font-semibold'
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

  const isDisabled = Boolean(disabled || isLoading)

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: isDisabled, busy: isLoading }}
      className={`relative min-h-[44px] flex-row items-center justify-center ${getVariantStyles()} ${getSizeStyles()} ${
        isDisabled ? 'opacity-50' : ''
      } ${className}`}
      {...props}
    >
        <View className="flex-row items-center justify-center" style={{ maxWidth: '100%', paddingHorizontal: 20 }}>
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text
            numberOfLines={singleLine ? 1 : undefined}
            adjustsFontSizeToFit={singleLine}
            minimumFontScale={0.8}
            style={{ flexShrink: 1 }}
            className={`text-center ${getTextStyles()}`}
          >
            {title}
          </Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
      <View pointerEvents="none" className="absolute right-2 w-4 items-center justify-center">
        {isLoading && <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#28a745' : '#ffffff'}
        />}
      </View>
    </TouchableOpacity>
  )
}
