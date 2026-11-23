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
      <Stack.Screen name="family" />
      <Stack.Screen name="family-result" />
      <Stack.Screen name="doctor/index" />
      <Stack.Screen name="doctor/time" />
      <Stack.Screen name="specialty/index" />
      <Stack.Screen name="package/index" />
      <Stack.Screen name="after-hours/index" />
      <Stack.Screen name="online/index" />
      <Stack.Screen name="online/time" />
      <Stack.Screen name="patient-info" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
