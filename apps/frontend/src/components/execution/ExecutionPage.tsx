import { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toastSuccess } from '@/hooks/use-toast'
import {
  createExecution,
  getExecution,
  isExecutionActive,
  listExecutions,
  pollExecution,
  resumeExecution,
  formatExecutionStep,
  type ExecutionDetail,
  type ExecutionSummary,
} from '@/services/execution.service'
import { ExecutionDetails } from './ExecutionDetails'
import { ExecutionForm } from './ExecutionForm'
import { ExecutionHistory } from './ExecutionHistory'

type ExecutionPageProps = {
  runtimeId: string
  activeVersionId: string | null
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

function settledToastMessage(detail: ExecutionDetail) {
  switch (detail.status) {
    case 'Completed':
      return 'Execution completed'
    case 'Paused':
      return detail.parserError
        ? `Parsing paused — ${detail.parserError}`
        : 'Execution paused — you can resume from the current step'
    case 'Failed':
      return detail.parserError ?? 'Execution failed'
    default:
      return 'Execution finished'
  }
}

function progressLabel(detail: ExecutionDetail | null, pollingId: string | null) {
  if (!pollingId || !detail || detail.id !== pollingId) {
    return null
  }
  if (detail.currentStep === 'ParsingDocument') {
    return 'Parsing PDF… progress updates automatically.'
  }
  return `Running ${formatExecutionStep(detail.currentStep)}… this can take a few minutes.`
}

export function ExecutionPage({
  runtimeId,
  activeVersionId,
}: ExecutionPageProps) {
  const [file, setFile] = useState<File | null>(null)
  const [executions, setExecutions] = useState<ExecutionSummary[]>([])
  const [selected, setSelected] = useState<ExecutionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [pollingId, setPollingId] = useState<string | null>(null)
  const [resumeLoadingId, setResumeLoadingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollGeneration = useRef(0)

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
    setFile(null)
    setSelected(null)
    setPollingId(null)
    pollGeneration.current += 1
  }, [loadExecutions])

  const applyPollUpdate = useCallback(async (detail: ExecutionDetail) => {
    setSelected(detail)
    setExecutions((prev) =>
      prev.map((item) =>
        item.id === detail.id
          ? {
              ...item,
              status: detail.status,
              currentStep: detail.currentStep,
              retryCount: detail.retryCount,
              completedAt: detail.completedAt,
            }
          : item,
      ),
    )
  }, [])

  const watchExecution = useCallback(
    async (id: string) => {
      const generation = ++pollGeneration.current
      setPollingId(id)

      try {
        const detail = await pollExecution(id, (update) => {
          if (generation !== pollGeneration.current) return
          void applyPollUpdate(update)
        })

        if (generation !== pollGeneration.current) return

        await applyPollUpdate(detail)
        const list = await listExecutions(runtimeId)
        setExecutions(list)
        toastSuccess(settledToastMessage(detail))
      } catch (err) {
        if (generation !== pollGeneration.current) return
        setError(getErrorMessage(err, 'Failed to track execution progress'))
        await loadExecutions()
      } finally {
        if (generation === pollGeneration.current) {
          setPollingId(null)
        }
      }
    },
    [applyPollUpdate, loadExecutions, runtimeId],
  )

  const handleSelect = async (id: string) => {
    setError(null)
    try {
      const detail = await getExecution(id)
      setSelected(detail)
      if (isExecutionActive(detail.status) && pollingId !== id) {
        void watchExecution(id)
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load execution details'))
    }
  }

  const handleExecute = async () => {
    if (!file) {
      setError('Select a PDF file to execute')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const detail = await createExecution({
        runtimeId,
        versionId: activeVersionId,
        file,
      })
      setFile(null)
      setSelected(detail)
      const list = await listExecutions(runtimeId)
      setExecutions(list)
      setSubmitting(false)
      await watchExecution(detail.id)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to queue execution'))
      await loadExecutions()
      setSubmitting(false)
    }
  }

  const handleResume = async (id: string) => {
    setResumeLoadingId(id)
    setError(null)

    try {
      const detail = await resumeExecution(id)
      setSelected(detail)
      const list = await listExecutions(runtimeId)
      setExecutions(list)
      setResumeLoadingId(null)
      await watchExecution(id)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resume execution'))
      await loadExecutions()
      setResumeLoadingId(null)
    }
  }

  const statusMessage = progressLabel(selected, pollingId)

  return (
    <div className="space-y-8">
      <ExecutionForm
        file={file}
        submitting={submitting}
        disabled={!activeVersionId}
        onFileChange={setFile}
        onSubmit={() => void handleExecute()}
      />

      {!activeVersionId ? (
        <p className="text-sm text-muted-foreground" role="status">
          Publish a runtime version before running production executions.
        </p>
      ) : null}

      {statusMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {statusMessage}
        </p>
      ) : null}

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
          onSelect={(id) => void handleSelect(id)}
          onResume={(id) => void handleResume(id)}
        />
      )}

      {selected ? (
        <ExecutionDetails
          execution={selected}
          resumeLoading={resumeLoadingId === selected.id}
          onResume={() => void handleResume(selected.id)}
        />
      ) : null}
    </div>
  )
}
