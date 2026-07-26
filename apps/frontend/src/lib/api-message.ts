export function extractApiMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined
  }

  const message = (payload as { message?: unknown }).message
  if (typeof message === 'string' && message.length > 0) {
    return message
  }
  if (Array.isArray(message) && message.length > 0) {
    return String(message[0])
  }
  return undefined
}

export function shouldToastSuccess(
  method: string | undefined,
  skipSuccessToast: boolean | undefined,
): boolean {
  if (skipSuccessToast) {
    return false
  }
  const normalized = (method ?? 'get').toLowerCase()
  return (
    normalized === 'post' ||
    normalized === 'put' ||
    normalized === 'patch' ||
    normalized === 'delete'
  )
}
