import { VersionSelector } from '@/components/experiment/VersionSelector'
import type { RuntimeVersion } from '@/services/runtime-version.service'

type ComparisonSelectorProps = {
  versions: RuntimeVersion[]
  value: string
  onChange: (versionId: string) => void
  excludeVersionId?: string
  disabled?: boolean
}

export function ComparisonSelector({
  versions,
  value,
  onChange,
  excludeVersionId,
  disabled = false,
}: ComparisonSelectorProps) {
  const options = excludeVersionId
    ? versions.filter((version) => version.id !== excludeVersionId)
    : versions

  return (
    <VersionSelector
      id="evaluation-compare-version"
      label="Compare Against (Optional)"
      versions={options}
      value={value}
      onChange={onChange}
      allowEmpty
      emptyLabel="None"
      disabled={disabled}
    />
  )
}
