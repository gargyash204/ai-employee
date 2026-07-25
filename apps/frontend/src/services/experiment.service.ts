import { api } from '@/lib/api'

export type ExperimentVersionResult = {
  summary: string
  structuredData: Record<string, unknown>
}

export type RunExperimentResult = {
  sessionId: string
  versionA: ExperimentVersionResult
  versionB: ExperimentVersionResult | null
  evaluationRunId: string | null
  evaluationStatus: string | null
}

export type ExperimentSession = {
  id: string
  runtimeId: string
  versionAId: string
  versionBId: string | null
  document: string
  extractionA: Record<string, unknown>
  extractionB: Record<string, unknown> | null
  summaryA: string
  summaryB: string | null
  evaluationRunId: string | null
  createdAt: string
}

type ApiSuccess<T> = {
  success: true
  data: T
  message: string
}

const AI_TIMEOUT_MS = 90_000

export async function runExperiment(input: {
  versionAId: string
  versionBId?: string
  document: string
  runEvaluation?: boolean
  datasetId?: string
}) {
  const { data } = await api.post<ApiSuccess<RunExperimentResult>>(
    '/experiment/run',
    {
      versionAId: input.versionAId,
      versionBId: input.versionBId,
      document: input.document,
      runEvaluation: input.runEvaluation,
      datasetId: input.datasetId,
    },
    { timeout: AI_TIMEOUT_MS },
  )
  return data.data
}

export async function getExperimentSession(sessionId: string) {
  const { data } = await api.get<ApiSuccess<ExperimentSession>>(
    `/experiment/session/${sessionId}`,
  )
  return data.data
}
