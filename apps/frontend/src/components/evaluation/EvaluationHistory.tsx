import type { EvaluationRunSummary } from '@/services/evaluation.service'

type EvaluationHistoryProps = {
  runs: EvaluationRunSummary[]
  selectedRunId: string | null
  onSelect: (runId: string) => void
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const minutes = Math.floor(diffMs / 60_000)

  if (minutes < 1) {
    return 'Just now'
  }
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  const days = Math.floor(hours / 24)
  if (days < 7) {
    return `${days} day${days === 1 ? '' : 's'} ago`
  }

  return date.toLocaleString()
}

export function EvaluationHistory({
  runs,
  selectedRunId,
  onSelect,
}: EvaluationHistoryProps) {
  if (runs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No previous evaluation runs yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Previous Runs</h3>
      <ul className="divide-y rounded-md border">
        {runs.map((run, index) => {
          const versionLabel =
            run.runtimeVersionNumber !== null
              ? `${run.runtimeVersionStatus ?? 'Version'} v${run.runtimeVersionNumber}`
              : 'Unknown version'

          return (
            <li key={run.id}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 ${
                  selectedRunId === run.id ? 'bg-muted/60' : ''
                }`}
                onClick={() => onSelect(run.id)}
              >
                <div>
                  <p className="font-medium">
                    Run #{runs.length - index} · {versionLabel}
                  </p>
                  <p className="text-muted-foreground">
                    {run.datasetName} · {run.status} ·{' '}
                    {formatRelativeTime(run.startedAt)}
                  </p>
                </div>
                <p className="text-base font-semibold tabular-nums">
                  {run.score}%
                </p>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
