import { api } from '@/lib/api'

type ApiSuccess<T = undefined> = {
  success: true
  message?: string
  data?: T
}

export async function login(username: string, password: string) {
  const { data } = await api.post<ApiSuccess>('/auth/login', {
    username,
    password,
  })
  return data
}

export async function getMe() {
  const { data } = await api.get<ApiSuccess<{ authenticated: boolean }>>(
    '/auth/me',
  )
  return data
}

export async function logout() {
  const { data } = await api.post<ApiSuccess>('/auth/logout')
  return data
}
