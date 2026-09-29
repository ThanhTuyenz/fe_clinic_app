import React from 'react'
import {
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'

interface ScreenShellProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  onBackPress?: () => void
  rightElement?: React.ReactNode
  className?: string
}

export const ScreenShell: React.FC<ScreenShellProps> = ({
  children,
  title,
  showBackButton = false,
  onBackPress,
  rightElement,
  className = '',
}) => {
  const router = useRouter()

  const handleBack = () => {
    if (onBackPress) {
      onBackPress()
    } else {
      router.back()
    }
  }

  return (
    <SafeAreaView className={`flex-1 bg-white ${className}`} style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      {(title || showBackButton || rightElement) && (
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
          <View className="flex-row items-center flex-1">
            {showBackButton && (
              <TouchableOpacity
                onPress={handleBack}
                className="p-1 -ml-1 mr-2 rounded-full active:bg-slate-100"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={24} color="#0f172a" />
              </TouchableOpacity>
            )}
            {title && (
              <Text
                numberOfLines={1}
                className="text-lg font-bold text-slate-800 flex-1"
              >
                {title}
              </Text>
            )}
          </View>
          {rightElement && <View className="ml-2">{rightElement}</View>}
        </View>
      )}
      <View className="flex-1 bg-slate-50/50" style={{ flex: 1 }}>{children}</View>
    </SafeAreaView>
  )
}
