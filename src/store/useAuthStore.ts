import { create } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { User } from '../types/user'
import { STORAGE_KEYS } from '../constants/config'

interface AuthState {
  token: string | null
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  initializeAuth: () => Promise<void>
  setAuth: (token: string, user: User) => Promise<void>
  updateUser: (user: Partial<User>) => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,

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

  setAuth: async (token: string, user: User) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token),
        AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user)),
      ])
      set({ token, user, isAuthenticated: true })
    } catch (e) {
      console.error('Lỗi lưu auth session:', e)
    }
  },

  updateUser: async (partialUser: Partial<User>) => {
    const currentUser = get().user
    if (!currentUser) return
    const updated = { ...currentUser, ...partialUser }
    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updated))
    set({ user: updated })
  },

  logout: async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA),
      ])
      set({ token: null, user: null, isAuthenticated: false })
    } catch (e) {
      console.error('Lỗi khi logout:', e)
    }
  },
}))
