import { api } from '@/lib/api'
import {
  isExecutionActive,
  nextPollDelayMs,
  POLL_INITIAL_MS,
} from './execution-poll'

export type ExecutionStatus =
  | 'Queued'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Failed'
  | 'Cancelled'

export type ExecutionStep =
  | 'Queued'
  | 'ReadingDocument'
  | 'ExtractStructuredData'
  | 'GenerateAnswers'
  | 'ValidateResult'
  | 'SaveOutput'
  | 'Completed'

export type ExecutionCheckpoint = {
  id: string
  step: ExecutionStep
  output: Record<string, unknown>
  completedAt: string
}

export type ExecutionSummary = {
  id: string
  runtimeId: string
  runtimeVersionId: string
  runtimeVersionNumber: number | null
  runtimeVersionStatus: string | null
  status: ExecutionStatus
  currentStep: ExecutionStep
  retryCount: number
  startedAt: string
  completedAt: string | null
}

export type ExecutionDetail = ExecutionSummary & {
  document: string
  finalOutput: Record<string, unknown> | null
  checkpoints: ExecutionCheckpoint[]
}

type ApiSuccess<T> = {
  success: true
  data: T
  message: string
}

export { isExecutionActive, nextPollDelayMs } from './execution-poll'

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function createExecution(input: {
  runtimeId: string
  document: string
}) {
  const { data } = await api.post<ApiSuccess<ExecutionDetail>>(
    '/executions',
    input,
  )
  return data.data
}

export async function listExecutions(runtimeId: string) {
  const { data } = await api.get<ApiSuccess<ExecutionSummary[]>>(
    '/executions',
    { params: { runtimeId } },
  )
  return data.data
}

export async function getExecution(id: string) {
  const { data } = await api.get<ApiSuccess<ExecutionDetail>>(
    `/executions/${id}`,
  )
  return data.data
}

export async function pollExecution(
  id: string,
  onUpdate?: (detail: ExecutionDetail) => void,
): Promise<ExecutionDetail> {
  let delayMs = POLL_INITIAL_MS

  for (;;) {
    const detail = await getExecution(id)
    onUpdate?.(detail)
    if (!isExecutionActive(detail.status)) {
      return detail
    }
    await sleep(delayMs)
    delayMs = nextPollDelayMs(delayMs)
  }
}

export async function resumeExecution(id: string) {
  const { data } = await api.post<ApiSuccess<ExecutionDetail>>(
    `/executions/${id}/resume`,
  )
  return data.data
}

export async function cancelExecution(id: string) {
  const { data } = await api.post<ApiSuccess<ExecutionDetail>>(
    `/executions/${id}/cancel`,
  )
  return data.data
}

export const EXECUTION_STEP_ORDER: ExecutionStep[] = [
  'Queued',
  'ReadingDocument',
  'ExtractStructuredData',
  'GenerateAnswers',
  'ValidateResult',
  'SaveOutput',
]

export function formatExecutionStep(step: ExecutionStep) {
  switch (step) {
    case 'Queued':
      return 'Queued'
    case 'ReadingDocument':
      return 'Reading Document'
    case 'ExtractStructuredData':
      return 'Extract Structured Data'
    case 'GenerateAnswers':
      return 'Generate Answers'
    case 'ValidateResult':
      return 'Validate Result'
    case 'SaveOutput':
      return 'Save Output'
    case 'Completed':
      return 'Completed'
    default:
      return step
  }
}
