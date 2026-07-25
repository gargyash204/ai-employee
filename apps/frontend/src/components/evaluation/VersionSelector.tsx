import { VersionSelector } from '@/components/experiment/VersionSelector'
import type { RuntimeVersion } from '@/services/runtime-version.service'

type EvaluationVersionSelectorProps = {
  versions: RuntimeVersion[]
  value: string
  onChange: (versionId: string) => void
  disabled?: boolean
}

export function EvaluationVersionSelector({
  versions,
  value,
  onChange,
  disabled = false,
}: EvaluationVersionSelectorProps) {
  return (
    <VersionSelector
      id="evaluation-version"
      label="Runtime Version"
      versions={versions}
      value={value}
      onChange={onChange}
      disabled={disabled}
    />
  )
}
