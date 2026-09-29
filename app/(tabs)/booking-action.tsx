import React, { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View } from 'react-native'

export default function BookingActionScreen() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/booking')
  }, [])

  return <View className="flex-1 bg-white" />
}
