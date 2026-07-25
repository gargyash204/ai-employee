import { api } from '@/lib/api'

export type EvaluationDataset = {
  id: string
  runtimeId: string
  name: string
  description: string | null
  createdAt: string
}

export type EvaluationCase = {
  id: string
  datasetId: string
  name: string
  question: string
  expectedAnswer: string
  tags: string[]
  createdAt: string
}

export type DatasetDetail = {
  dataset: EvaluationDataset
  cases: EvaluationCase[]
}

export type RunEvaluationResult = {
  evaluationRunId: string
  score: number
  passed: number
  failed: number
}

export type EvaluationResult = {
  id: string
  evaluationCaseId: string
  caseName: string
  expectedAnswer: string
  actualAnswer: string | null
  passed: boolean
  latency: number
  error: string | null
  document: string
  question: string
  traceId?: string | null
}

export type EvaluationRunDetail = {
  id: string
  datasetId: string
  datasetName: string
  runtimeVersionId: string
  runtimeVersionNumber: number | null
  runtimeVersionStatus: string | null
  status: string
  totalTests: number
  passed: number
  failed: number
  score: number
  document: string | null
  startedAt: string
  completedAt: string | null
  results: EvaluationResult[]
}

export type EvaluationRunSummary = {
  id: string
  datasetId: string
  datasetName: string
  runtimeVersionId: string
  runtimeVersionNumber: number | null
  runtimeVersionStatus: string | null
  status: string
  totalTests: number
  passed: number
  failed: number
  score: number
  startedAt: string
  completedAt: string | null
}

export type CompareVersionsResult = {
  scoreA: number
  scoreB: number
  difference: number
  improvedCases: Array<{ evaluationCaseId: string; caseName: string }>
  regressedCases: Array<{ evaluationCaseId: string; caseName: string }>
  runAId: string
  runBId: string
}

type ApiSuccess<T> = {
  success: true
  data: T
  message: string
}

const AI_TIMEOUT_MS = 600_000

export async function listDatasets(runtimeId: string) {
  const { data } = await api.get<ApiSuccess<EvaluationDataset[]>>(
    `/evaluations/runtime/${runtimeId}/datasets`,
  )
  return data.data
}

export async function getDataset(datasetId: string) {
  const { data } = await api.get<ApiSuccess<DatasetDetail>>(
    `/evaluations/dataset/${datasetId}`,
  )
  return data.data
}

export async function createDataset(input: {
  runtimeId: string
  name: string
  description?: string
}) {
  const { data } = await api.post<ApiSuccess<EvaluationDataset>>(
    '/evaluations/dataset',
    input,
  )
  return data.data
}

export async function createCase(input: {
  datasetId: string
  name: string
  question: string
  expectedAnswer: string
  tags?: string[]
}) {
  const { data } = await api.post<ApiSuccess<EvaluationCase>>(
    '/evaluations/case',
    input,
  )
  return data.data
}

export async function updateCase(
  id: string,
  input: {
    name?: string
    question?: string
    expectedAnswer?: string
    tags?: string[]
  },
) {
  const { data } = await api.put<ApiSuccess<EvaluationCase>>(
    `/evaluations/case/${id}`,
    input,
  )
  return data.data
}

export async function deleteCase(id: string) {
  const { data } = await api.delete<ApiSuccess<null>>(
    `/evaluations/case/${id}`,
  )
  return data.data
}

export async function runEvaluation(input: {
  datasetId: string
  runtimeVersionId: string
  document: string
}) {
  const { data } = await api.post<ApiSuccess<RunEvaluationResult>>(
    '/evaluations/run',
    input,
    { timeout: AI_TIMEOUT_MS },
  )
  return data.data
}

export async function getEvaluationRun(id: string) {
  const { data } = await api.get<ApiSuccess<EvaluationRunDetail>>(
    `/evaluations/run/${id}`,
  )
  return data.data
}

export async function getEvaluationHistory(runtimeId: string) {
  const { data } = await api.get<ApiSuccess<EvaluationRunSummary[]>>(
    `/evaluations/runtime/${runtimeId}`,
  )
  return data.data
}

export async function compareVersions(input: {
  runtimeVersionA: string
  runtimeVersionB: string
  datasetId: string
}) {
  const { data } = await api.post<ApiSuccess<CompareVersionsResult>>(
    '/evaluations/compare',
    input,
  )
  return data.data
}
