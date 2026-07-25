import { Label } from '@/components/ui/label'
import type { RuntimeVersion } from '@/services/runtime-version.service'

type VersionSelectorProps = {
  id: string
  label: string
  versions: RuntimeVersion[]
  value: string
  onChange: (versionId: string) => void
  allowEmpty?: boolean
  emptyLabel?: string
  disabled?: boolean
}

function formatVersionLabel(version: RuntimeVersion) {
  return `${version.status} v${version.version}`
}

export function VersionSelector({
  id,
  label,
  versions,
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = 'None',
  disabled = false,
}: VersionSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {allowEmpty ? <option value="">{emptyLabel}</option> : null}
        {versions.map((version) => (
          <option key={version.id} value={version.id}>
            {formatVersionLabel(version)}
          </option>
        ))}
      </select>
    </div>
  )
}
