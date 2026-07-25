import { api } from '@/lib/api'

export type Runtime = {
  id: string
  name: string
  description: string | null
  activeVersionId: string | null
  createdAt: string
  updatedAt: string
}

type ApiSuccess<T> = {
  success: true
  data: T
  message: string
}

export type CreateRuntimePayload = {
  name: string
  description?: string
}

export type UpdateRuntimePayload = {
  name?: string
  description?: string
}

export async function listRuntimes() {
  const { data } = await api.get<ApiSuccess<Runtime[]>>('/runtime')
  return data.data
}

export async function getRuntime(id: string) {
  const { data } = await api.get<ApiSuccess<Runtime>>(`/runtime/${id}`)
  return data.data
}

export async function createRuntime(payload: CreateRuntimePayload) {
  const { data } = await api.post<ApiSuccess<Runtime>>('/runtime', payload)
  return data.data
}

export async function updateRuntime(id: string, payload: UpdateRuntimePayload) {
  const { data } = await api.patch<ApiSuccess<Runtime>>(
    `/runtime/${id}`,
    payload,
  )
  return data.data
}

export async function deleteRuntime(id: string) {
  const { data } = await api.delete<ApiSuccess<null>>(`/runtime/${id}`)
  return data
}
