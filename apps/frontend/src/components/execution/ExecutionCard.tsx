import {
  formatExecutionStep,
  type ExecutionSummary,
} from '@/services/execution.service'
import { ExecutionStatusBadge } from './ExecutionStatusBadge'
import { ResumeButton } from './ResumeButton'
import { CancelButton } from './CancelButton'

type ExecutionCardProps = {
  execution: ExecutionSummary
  displayNumber: number
  selected: boolean
  resumeLoading?: boolean
  cancelLoading?: boolean
  onSelect: () => void
  onResume: () => void
  onCancel: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function ExecutionCard({
  execution,
  displayNumber,
  selected,
  resumeLoading,
  cancelLoading,
  onSelect,
  onResume,
  onCancel,
}: ExecutionCardProps) {
  const canResume = execution.status === 'Paused'
  const canCancel =
    execution.status === 'Queued' ||
    execution.status === 'Running' ||
    execution.status === 'Paused'

  return (
    <div
      className={`rounded-md border px-4 py-3 transition-colors ${
        selected ? 'border-primary bg-muted/40' : 'hover:bg-muted/30'
      }`}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={onSelect}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Execution #{displayNumber}</p>
          <ExecutionStatusBadge status={execution.status} />
        </div>

        {execution.status === 'Completed' ? (
          <p className="mt-2 text-sm text-muted-foreground">Output Ready</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Current Step · {formatExecutionStep(execution.currentStep)}
          </p>
        )}

        <p className="mt-1 text-xs text-muted-foreground">
          Started {formatTime(execution.startedAt)}
        </p>
      </button>

      {(canResume || canCancel) && (
        <div className="mt-3 flex gap-2">
          {canResume ? (
            <ResumeButton
              loading={resumeLoading}
              onClick={onResume}
            />
          ) : null}
          {canCancel ? (
            <CancelButton
              loading={cancelLoading}
              onClick={onCancel}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}
