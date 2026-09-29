import { Stack } from 'expo-router'

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="patient-info" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
