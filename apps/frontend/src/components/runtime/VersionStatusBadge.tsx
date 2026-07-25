import { cn } from '@/lib/utils'
import type { RuntimeVersionStatus } from '@/services/runtime-version.service'

const STATUS_CLASS: Record<RuntimeVersionStatus, string> = {
  Draft: 'bg-amber-100 text-amber-900',
  Published: 'bg-emerald-100 text-emerald-900',
  Archived: 'bg-muted text-muted-foreground',
}

type VersionStatusBadgeProps = {
  status: RuntimeVersionStatus
}

export function VersionStatusBadge({ status }: VersionStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        STATUS_CLASS[status],
      )}
    >
      {status}
    </span>
  )
}
