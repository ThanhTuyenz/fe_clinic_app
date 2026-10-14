import { isRunningInExpoGo } from 'expo'
import { Platform, TurboModuleRegistry } from 'react-native'

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin')

let googleModule: GoogleSignInModule | undefined

export async function getGoogleIdToken(): Promise<string | null> {
  if (isRunningInExpoGo()) {
    throw new Error('Đăng nhập Google cần bản app development build. Vui lòng mở bản VitaCare đã cài riêng.')
  }
  if (Platform.OS !== 'android') {
    throw new Error('Đăng nhập Google native hiện được cấu hình cho Android.')
  }
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.trim()
  if (!webClientId) {
    throw new Error('Chưa cấu hình Google Client ID cho app.')
  }
  if (!TurboModuleRegistry.get('RNGoogleSignin')) {
    throw new Error('Bản app chưa có Google Sign-In. Vui lòng cài development build mới nhất.')
  }

  if (!googleModule) {
    // Expo Go and older builds must not import a package that requires a native module.
    googleModule = require('@react-native-google-signin/google-signin') as GoogleSignInModule
    googleModule.GoogleSignin.configure({ webClientId })
  }

  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = googleModule
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    // Show account selection again after the patient signs out of VitaCare.
    if (GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut()
    const response = await GoogleSignin.signIn()
    if (!isSuccessResponse(response)) return null
    if (!response.data.idToken) {
      throw new Error('Google chưa trả về ID Token. Vui lòng kiểm tra cấu hình Web Client ID.')
    }
    return response.data.idToken
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null
      if (error.code === statusCodes.IN_PROGRESS) return null
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Vui lòng cập nhật Google Play Services để đăng nhập Google.')
      }
    }
    throw error
  }
}
