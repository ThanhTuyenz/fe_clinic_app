import { Stack } from 'expo-router'

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    >
      <Stack.Screen name="select-doctor" />
      <Stack.Screen name="select-datetime" />
      <Stack.Screen name="patient-info" />
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
