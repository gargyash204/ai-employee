import { VersionStatusBadge } from './VersionStatusBadge'
import type { RuntimeVersion } from '@/services/runtime-version.service'
import { cn } from '@/lib/utils'

type VersionCardProps = {
  version: RuntimeVersion
  selected: boolean
  onSelect: () => void
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export function VersionCard({ version, selected, onSelect }: VersionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-md border px-4 py-3 text-left transition-colors hover:bg-accent/50',
        selected && 'border-primary bg-accent/40',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Version {version.version}</span>
        <VersionStatusBadge status={version.status} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Created {formatDate(version.createdAt)}
      </p>
    </button>
  )
}
