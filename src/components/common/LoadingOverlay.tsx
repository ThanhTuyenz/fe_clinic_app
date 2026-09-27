import React from 'react'
import { ActivityIndicator, Modal, Text, View } from 'react-native'

interface LoadingOverlayProps {
  visible: boolean
  message?: string
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Đang xử lý...',
}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View className="flex-1 bg-black/40 justify-center items-center px-4">
        <View className="bg-white px-6 py-5 rounded-2xl items-center shadow-lg min-w-[180px]">
          <ActivityIndicator size="large" color="#0284c7" />
          <Text className="text-slate-700 text-sm font-medium mt-3 text-center">
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  )
}
