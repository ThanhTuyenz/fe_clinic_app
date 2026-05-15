import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import Ionicons from '@expo/vector-icons/Ionicons'
import AIChatScreen from '../screens/AIChatScreen.js'
import AppointmentDetailScreen from '../screens/AppointmentDetailScreen.js'
import AppointmentScreen from '../screens/AppointmentScreen.js'
import HomeScreen from '../screens/HomeScreen.js'
import LoginScreen from '../screens/LoginScreen.js'
import MyAppointmentsScreen from '../screens/MyAppointmentsScreen.js'
import ChangePasswordScreen from '../screens/ChangePasswordScreen.js'
import PersonalInfoScreen from '../screens/PersonalInfoScreen.js'
import ProfileScreen from '../screens/ProfileScreen.js'
import RegisterScreen from '../screens/RegisterScreen.js'
import VerifyOtpScreen from '../screens/VerifyOtpScreen.js'
import { getSession } from '../lib/session.js'
import { colors } from '../theme/colors.js'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="MyAppointmentsTab"
        component={MyAppointmentsScreen}
        options={{
          title: 'Lịch khám',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="AIChatTab"
        component={AIChatScreen}
        options={{
          title: 'Trợ lý AI',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Tôi',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size + 2} color={color} />,
        }}
      />
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const [ready, setReady] = useState(false)
  const [initialRouteName, setInitialRouteName] = useState('Login')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { token } = await getSession()
      if (!cancelled) {
        setInitialRouteName(token ? 'MainTabs' : 'Login')
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Đăng nhập' }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Đăng ký' }} />
        <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} options={{ title: 'Xác thực OTP' }} />
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ title: 'Thông tin cá nhân' }} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Đổi mật khẩu' }} />
        <Stack.Screen name="Appointment" component={AppointmentScreen} options={{ title: 'Đặt lịch khám' }} />
        <Stack.Screen
          name="AppointmentDetail"
          component={AppointmentDetailScreen}
          options={{ title: 'Chi tiết lịch khám' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
