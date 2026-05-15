import AsyncStorage from '@react-native-async-storage/async-storage'

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export async function getSession() {
  const token = (await AsyncStorage.getItem(TOKEN_KEY)) || ''
  const userRaw = await AsyncStorage.getItem(USER_KEY)
  let user = null
  if (userRaw) {
    try {
      user = JSON.parse(userRaw)
    } catch {
      user = null
    }
  }
  return { token, user }
}

export async function saveSession({ token, user }) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, String(token || '')],
    [USER_KEY, JSON.stringify(user || null)],
  ])
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY])
}
