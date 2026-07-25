import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import {
  cancelExecution,
  createExecution,
  getExecution,
  listExecutions,
  resumeExecution,
  type ExecutionDetail,
  type ExecutionSummary,
} from '@/services/execution.service'
import { ExecutionDetails } from './ExecutionDetails'
import { ExecutionForm } from './ExecutionForm'
import { ExecutionHistory } from './ExecutionHistory'

type ExecutionPageProps = {
  runtimeId: string
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
    if (Array.isArray(message) && message.length > 0) {
      return String(message[0])
    }
  }
  return fallback
}

export function ExecutionPage({ runtimeId }: ExecutionPageProps) {
  const [document, setDocument] = useState('')
  const [executions, setExecutions] = useState<ExecutionSummary[]>([])
  const [selected, setSelected] = useState<ExecutionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [resumeLoadingId, setResumeLoadingId] = useState<string | null>(null)
  const [cancelLoadingId, setCancelLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadExecutions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await listExecutions(runtimeId)
      setExecutions(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load executions'))
      setExecutions([])
    } finally {
      setLoading(false)
    }
  }, [runtimeId])

  useEffect(() => {
    void loadExecutions()
    setDocument('')
    setSelected(null)
  }, [loadExecutions])

  const handleSelect = async (id: string) => {
    setError(null)
    try {
      const detail = await getExecution(id)
      setSelected(detail)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load execution details'))
    }
  }

  const refreshAfterMutation = async (detail: ExecutionDetail) => {
    setSelected(detail)
    const data = await listExecutions(runtimeId)
    setExecutions(data)
  }

  const handleExecute = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const detail = await createExecution({
        runtimeId,
        document,
      })
      setDocument('')
      await refreshAfterMutation(detail)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to execute document'))
      await loadExecutions()
    } finally {
      setSubmitting(false)
    }
  }

  const handleResume = async (id: string) => {
    setResumeLoadingId(id)
    setError(null)

    try {
      const detail = await resumeExecution(id)
      await refreshAfterMutation(detail)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resume execution'))
      await loadExecutions()
    } finally {
      setResumeLoadingId(null)
    }
  }

  const handleCancel = async (id: string) => {
    setCancelLoadingId(id)
    setError(null)

    try {
      const detail = await cancelExecution(id)
      await refreshAfterMutation(detail)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to cancel execution'))
      await loadExecutions()
    } finally {
      setCancelLoadingId(null)
    }
  }

  return (
    <div className="space-y-8">
      <ExecutionForm
        document={document}
        submitting={submitting}
        onDocumentChange={setDocument}
        onSubmit={() => void handleExecute()}
      />

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading executions…</p>
      ) : (
        <ExecutionHistory
          executions={executions}
          selectedId={selected?.id ?? null}
          resumeLoadingId={resumeLoadingId}
          cancelLoadingId={cancelLoadingId}
          onSelect={(id) => void handleSelect(id)}
          onResume={(id) => void handleResume(id)}
          onCancel={(id) => void handleCancel(id)}
        />
      )}

      {selected ? (
        <ExecutionDetails
          execution={selected}
          resumeLoading={resumeLoadingId === selected.id}
          cancelLoading={cancelLoadingId === selected.id}
          onResume={() => void handleResume(selected.id)}
          onCancel={() => void handleCancel(selected.id)}
        />
      ) : null}
    </div>
  )
}
