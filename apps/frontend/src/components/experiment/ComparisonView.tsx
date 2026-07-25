import type { ExperimentVersionResult } from '@/services/experiment.service'
import { ResultCard } from './ResultCard'

type ComparisonViewProps = {
  versionALabel: string
  versionA: ExperimentVersionResult
  versionBLabel?: string
  versionB?: ExperimentVersionResult | null
}

export function ComparisonView({
  versionALabel,
  versionA,
  versionBLabel,
  versionB,
}: ComparisonViewProps) {
  if (!versionB || !versionBLabel) {
    return <ResultCard title={versionALabel} result={versionA} />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ResultCard title={versionALabel} result={versionA} />
      <ResultCard title={versionBLabel} result={versionB} />
    </div>
  )
}
