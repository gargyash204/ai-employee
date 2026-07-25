import type { ExecutionSummary } from '@/services/execution.service'
import { ExecutionCard } from './ExecutionCard'

type ExecutionHistoryProps = {
  executions: ExecutionSummary[]
  selectedId: string | null
  resumeLoadingId: string | null
  cancelLoadingId: string | null
  onSelect: (id: string) => void
  onResume: (id: string) => void
  onCancel: (id: string) => void
}

export function ExecutionHistory({
  executions,
  selectedId,
  resumeLoadingId,
  cancelLoadingId,
  onSelect,
  onResume,
  onCancel,
}: ExecutionHistoryProps) {
  if (executions.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No production executions yet.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Execution History</h3>
      <div className="space-y-2">
        {executions.map((execution, index) => (
          <ExecutionCard
            key={execution.id}
            execution={execution}
            displayNumber={executions.length - index}
            selected={selectedId === execution.id}
            resumeLoading={resumeLoadingId === execution.id}
            cancelLoading={cancelLoadingId === execution.id}
            onSelect={() => onSelect(execution.id)}
            onResume={() => onResume(execution.id)}
            onCancel={() => onCancel(execution.id)}
          />
        ))}
      </div>
    </div>
  )
}
