import React, { useContext } from 'react'
import {
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BottomTabBarHeightContext } from 'expo-router/js-tabs'

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
  const insets = useSafeAreaInsets()
  const tabBarHeight = useContext(BottomTabBarHeightContext)

  const handleBack = () => {
    if (onBackPress) {
      onBackPress()
    } else {
      router.back()
    }
  }

  return (
    <View
      className={`flex-1 bg-white ${className}`}
      style={{
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: tabBarHeight == null ? insets.bottom : 0,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <StatusBar barStyle="dark-content" />
      {(title || showBackButton || rightElement) && (
        <View className="flex-row items-center justify-between px-4 py-4 border-b border-slate-100 bg-white" style={{ minHeight: 64 }}>
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
                numberOfLines={2}
                className="text-lg leading-6 font-bold text-slate-800 flex-1"
              >
                {title}
              </Text>
            )}
          </View>
          {rightElement && <View className="ml-2">{rightElement}</View>}
        </View>
      )}
      <View className="flex-1 bg-slate-50/50" style={{ flex: 1 }}>{children}</View>
    </View>
  )
}
