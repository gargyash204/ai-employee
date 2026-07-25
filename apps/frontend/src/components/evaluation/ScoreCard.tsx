type ScoreCardProps = {
  score: number | null
  passed: number | null
  failed: number | null
  comparison?: {
    previousScore: number
    currentScore: number
    difference: number
    improvedCount: number
    regressedCount: number
  } | null
}

export function ScoreCard({
  score,
  passed,
  failed,
  comparison = null,
}: ScoreCardProps) {
  if (score === null) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Run a regression from Development Studio to see the latest score.
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-sm text-muted-foreground">Latest Score</p>
          <p className="text-3xl font-semibold tabular-nums">{score}%</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Passed</p>
          <p className="text-3xl font-semibold tabular-nums text-emerald-700">
            {passed ?? 0}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-3xl font-semibold tabular-nums text-destructive">
            {failed ?? 0}
          </p>
        </div>
      </div>

      {comparison ? (
        <div className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Previous Score</p>
            <p className="font-medium tabular-nums">
              {comparison.previousScore}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Score</p>
            <p className="font-medium tabular-nums">
              {comparison.currentScore}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Difference</p>
            <p
              className={`font-medium tabular-nums ${
                comparison.difference >= 0
                  ? 'text-emerald-700'
                  : 'text-destructive'
              }`}
            >
              {comparison.difference >= 0 ? '+' : ''}
              {comparison.difference}%
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Cases</p>
            <p className="font-medium">
              {comparison.improvedCount} improved · {comparison.regressedCount}{' '}
              regressed
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
