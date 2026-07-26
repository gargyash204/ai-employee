export type ActiveExecutionStatus = 'Queued' | 'Running'

export const POLL_INITIAL_MS = 1_000
export const POLL_MAX_MS = 16_000

export function isExecutionActive(
  status: string,
): status is ActiveExecutionStatus {
  return status === 'Queued' || status === 'Running'
}

export function nextPollDelayMs(currentMs: number) {
  return Math.min(currentMs * 2, POLL_MAX_MS)
}
