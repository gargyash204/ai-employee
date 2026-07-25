import { api } from '@/lib/api'

export type RuntimeVersionStatus = 'Draft' | 'Published' | 'Archived'

export type RuntimeVersion = {
  id: string
  runtimeId: string
  version: number
  instructions: string
  status: RuntimeVersionStatus
  createdAt: string
  updatedAt: string
}

type ApiSuccess<T> = {
  success: true
  data: T
  message: string
}

export async function listRuntimeVersions(runtimeId: string) {
  const { data } = await api.get<ApiSuccess<RuntimeVersion[]>>(
    `/runtime/${runtimeId}/versions`,
  )
  return data.data
}

export async function getRuntimeDraft(runtimeId: string) {
  const { data } = await api.get<ApiSuccess<RuntimeVersion>>(
    `/runtime/${runtimeId}/draft`,
  )
  return data.data
}

export async function updateRuntimeDraft(
  runtimeId: string,
  instructions: string,
) {
  const { data } = await api.put<ApiSuccess<RuntimeVersion>>(
    `/runtime/${runtimeId}/draft`,
    { instructions },
  )
  return data.data
}

export async function publishRuntimeDraft(runtimeId: string) {
  const { data } = await api.post<ApiSuccess<RuntimeVersion>>(
    `/runtime/${runtimeId}/publish`,
  )
  return data.data
}

export async function getRuntimeVersion(versionId: string) {
  const { data } = await api.get<ApiSuccess<RuntimeVersion>>(
    `/runtime/version/${versionId}`,
  )
  return data.data
}
