import type { EvaluationResult } from '@/services/evaluation.service'

type EvaluationResultsTableProps = {
  results: EvaluationResult[]
  selectedResultId: string | null
  onSelect: (result: EvaluationResult) => void
}

export function EvaluationResultsTable({
  results,
  selectedResultId,
  onSelect,
}: EvaluationResultsTableProps) {
  if (results.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        No results for this run.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Results</h3>
      <ul className="divide-y rounded-md border">
        {results.map((result) => (
          <li key={result.id}>
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-muted/50 ${
                selectedResultId === result.id ? 'bg-muted/60' : ''
              }`}
              onClick={() => onSelect(result)}
            >
              <div className="flex items-center gap-2">
                <span
                  className={
                    result.passed ? 'text-emerald-700' : 'text-destructive'
                  }
                >
                  {result.passed ? '✓' : '✗'}
                </span>
                <span className="font-medium">{result.caseName}</span>
              </div>
              <span
                className={`text-xs font-semibold uppercase tracking-wide ${
                  result.passed ? 'text-emerald-700' : 'text-destructive'
                }`}
              >
                {result.passed ? 'PASS' : 'FAIL'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
