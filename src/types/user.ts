export interface User {
  id?: string | number
  _id?: string
  full_name?: string
  fullName?: string
  name?: string
  email?: string
  phone?: string
  role?: string
  avatar?: string
  address?: string
  date_of_birth?: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other' | string
  created_at?: string
}

export interface AuthSession {
  token: string
  user: User | null
}

export interface LoginResponse {
  token?: string
  accessToken?: string
  user?: User
  message?: string
}
