import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { User } from '../types/user'
import { STORAGE_KEYS } from '../constants/config'

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  sessionVersion: number
  initializeAuth: () => Promise<void>
  setAuth: (token: string, user: User, refreshToken?: string) => Promise<void>
  setToken: (token: string, refreshToken?: string) => Promise<void>
  updateUser: (user: Partial<User>) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  sessionVersion: 0,

  initializeAuth: async () => {
    try {
      set({ isLoading: true })
      const [savedToken, savedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_DATA),
      ])

      if (savedToken) {
        const parsedUser: User | null = savedUser ? JSON.parse(savedUser) : null
        set({
          token: savedToken,
          user: parsedUser,
          isAuthenticated: true,
          isLoading: false,
        })
      } else {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        })
      }
    } catch {
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  setAuth: async (token: string, user: User, refreshToken?: string) => {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token),
      AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
      refreshToken
        ? AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
        : AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
    ])
    set(state => ({ token, user, isAuthenticated: true, sessionVersion: state.sessionVersion + 1 }))
  },

  setToken: async (token: string, refreshToken?: string) => {
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token),
      ...(refreshToken ? [AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)] : []),
    ])
    set({ token })
  },

  updateUser: async (partialUser: Partial<User>) => {
    const currentUser = get().user
    if (!currentUser) return
    const updated = { ...currentUser, ...partialUser }
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updated))
    set({ user: updated })
  },

  logout: async () => {
    set(state => ({ token: null, user: null, isAuthenticated: false, sessionVersion: state.sessionVersion + 1 }))
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
      ])
    } catch (e) {
      console.error('Lỗi khi logout:', e)
    }
  },
}))
