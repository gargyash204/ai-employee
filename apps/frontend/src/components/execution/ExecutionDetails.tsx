import {
  formatExecutionStep,
  isExecutionActive,
  type ExecutionDetail,
} from '@/services/execution.service'
import { CheckpointTimeline } from './CheckpointTimeline'
import { ExecutionStatusBadge } from './ExecutionStatusBadge'
import { ResumeButton } from './ResumeButton'

type ExecutionDetailsProps = {
  execution: ExecutionDetail
  resumeLoading?: boolean
  onResume: () => void
}

function formatVersionLabel(execution: ExecutionDetail) {
  if (execution.runtimeVersionNumber === null) {
    return 'Unknown version'
  }
  return `${execution.runtimeVersionStatus ?? 'Version'} v${execution.runtimeVersionNumber}`
}

export function ExecutionDetails({
  execution,
  resumeLoading,
  onResume,
}: ExecutionDetailsProps) {
  const canResume = execution.status === 'Paused'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Execution Details</h3>
          <p className="mt-1 text-xs text-muted-foreground">{execution.id}</p>
        </div>
        {canResume ? (
          <ResumeButton loading={resumeLoading} onClick={onResume} />
        ) : null}
      </div>

      {isExecutionActive(execution.status) ? (
        <p className="text-sm text-muted-foreground" role="status">
          Still running — checkpoints appear as each step finishes.
        </p>
      ) : null}

      <dl className="space-y-3 text-sm">
        <div className="grid grid-cols-[9rem_1fr] gap-2">
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            <ExecutionStatusBadge status={execution.status} />
          </dd>
        </div>
        <div className="grid grid-cols-[9rem_1fr] gap-2">
          <dt className="text-muted-foreground">Current Step</dt>
          <dd>{formatExecutionStep(execution.currentStep)}</dd>
        </div>
        <div className="grid grid-cols-[9rem_1fr] gap-2">
          <dt className="text-muted-foreground">Runtime Version</dt>
          <dd>{formatVersionLabel(execution)}</dd>
        </div>
        <div className="grid grid-cols-[9rem_1fr] gap-2">
          <dt className="text-muted-foreground">Retry Count</dt>
          <dd>{execution.retryCount}</dd>
        </div>
        {execution.parserError ? (
          <div className="grid grid-cols-[9rem_1fr] gap-2">
            <dt className="text-muted-foreground">Failure Reason</dt>
            <dd className="text-destructive">{execution.parserError}</dd>
          </div>
        ) : null}
      </dl>

      <div>
        <h4 className="mb-3 text-sm font-medium">Checkpoint History</h4>
        <CheckpointTimeline
          status={execution.status}
          currentStep={execution.currentStep}
          checkpoints={execution.checkpoints}
        />
      </div>

      {execution.status === 'Completed' && execution.finalOutput ? (
        <div>
          <h4 className="mb-2 text-sm font-medium">Final Output</h4>
          <pre className="max-h-80 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
            {JSON.stringify(execution.finalOutput, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
