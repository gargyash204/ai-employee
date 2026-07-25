import { api } from '@/lib/api'

export type RuntimeSummary = {
  runtimeId: string
  name: string
  status: 'Published' | 'Draft' | 'Unpublished'
  publishedVersion: number | null
  draftVersion: number | null
  executions: number
  latestEvaluationScore: number | null
}

export type ObservabilitySummary = {
  executions: number
  experiments: number
  evaluations: number
  publishedVersions: number
  averageLatencyMs: number | null
  averageTokens: number | null
  averageCost: number | null
  executionSuccessRate: number | null
  evaluationSuccessRate: number | null
  latestActivityAt: string | null
}

export type ActivityFeedItem = {
  id: string
  eventType: string
  entityType: string
  entityId: string
  title: string
  description: string | null
  traceId: string | null
  langfuseUrl?: string | null
  createdAt: string
  hasDetails: boolean
  metadata: Record<string, unknown> | null
}

export type LangfuseTelemetry = {
  traceId: string | null
  model: string | null
  provider: string | null
  latencyMs: number | null
  inputTokens: number | null
  outputTokens: number | null
  totalTokens: number | null
  cost: number | null
  prompt: string | null
  response: string | null
  input: unknown
  error: string | null
  available: boolean
  langfuseUrl: string | null
}

export type ActivityDetails = {
  activity: ActivityFeedItem
  telemetry: LangfuseTelemetry | null
  details: Record<string, unknown>
}

export type ObservabilityOverview = {
  summary: RuntimeSummary
  activity: ActivityFeedItem[]
  activityTotal: number
  statistics: ObservabilitySummary
}

type ApiSuccess<T> = {
  success: true
  data: T
  message: string
}

export async function getObservabilityOverview(
  runtimeId: string,
  options?: { limit?: number; offset?: number },
) {
  const { data } = await api.get<ApiSuccess<ObservabilityOverview>>(
    `/observability/runtime/${runtimeId}`,
    { params: options },
  )
  return data.data
}

export async function getObservabilitySummary(runtimeId: string) {
  const { data } = await api.get<ApiSuccess<ObservabilitySummary>>(
    `/observability/summary/${runtimeId}`,
  )
  return data.data
}

export async function getActivityDetails(activityId: string) {
  const { data } = await api.get<ApiSuccess<ActivityDetails>>(
    `/observability/activity/${activityId}`,
  )
  return data.data
}
