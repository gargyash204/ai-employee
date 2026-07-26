import { cn } from '@/lib/utils'
import type { ExecutionStatus } from '@/services/execution.service'

type ExecutionStatusBadgeProps = {
  status: ExecutionStatus
}

const STATUS_STYLES: Record<ExecutionStatus, string> = {
  Queued: 'bg-muted text-muted-foreground',
  Running: 'bg-blue-100 text-blue-800',
  Paused: 'bg-amber-100 text-amber-900',
  Completed: 'bg-emerald-100 text-emerald-900',
  Failed: 'bg-red-100 text-red-800',
}

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  )
}
