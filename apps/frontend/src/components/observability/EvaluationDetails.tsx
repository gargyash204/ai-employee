import { Button } from '@/components/ui/button'
import type { LangfuseTelemetry } from '@/services/observability.service'

type EvaluationResultRow = {
  id: string
  evaluationCaseId: string
  question?: string | null
  expectedAnswer: string
  actualAnswer: string | null
  passed: boolean
  latency: number
  error: string | null
  traceId: string | null
  langfuseUrl: string | null
}

type EvaluationDetailsProps = {
  details: Record<string, unknown>
  telemetry: LangfuseTelemetry | null
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

export function EvaluationDetails({ details }: EvaluationDetailsProps) {
  const results = Array.isArray(details.results)
    ? (details.results as EvaluationResultRow[])
    : []

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Dataset</dt>
        <dd>{asString(details.datasetName) ?? '—'}</dd>
        <dt className="text-muted-foreground">Runtime Version</dt>
        <dd>
          {details.runtimeVersionNumber != null
            ? `v${String(details.runtimeVersionNumber)}`
            : '—'}
        </dd>
        <dt className="text-muted-foreground">Score</dt>
        <dd>
          {asNumber(details.score) != null ? `${asNumber(details.score)}%` : '—'}
        </dd>
        <dt className="text-muted-foreground">Passed</dt>
        <dd>{asNumber(details.passed) ?? '—'}</dd>
        <dt className="text-muted-foreground">Failed</dt>
        <dd>{asNumber(details.failed) ?? '—'}</dd>
        <dt className="text-muted-foreground">Duration</dt>
        <dd>
          {asNumber(details.durationMs) != null
            ? `${asNumber(details.durationMs)} ms`
            : '—'}
        </dd>
        <dt className="text-muted-foreground">Average Latency</dt>
        <dd>
          {asNumber(details.averageLatencyMs) != null
            ? `${asNumber(details.averageLatencyMs)} ms`
            : '—'}
        </dd>
      </dl>

      <div className="space-y-3">
        <h4 className="text-sm font-medium">Test Cases</h4>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No test case results</p>
        ) : (
          results.map((result) => (
            <div key={result.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    result.passed ? 'text-emerald-700' : 'text-destructive'
                  }
                >
                  {result.passed ? 'PASS' : 'FAIL'}
                </span>
                {!result.passed && result.langfuseUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={result.langfuseUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Trace
                    </a>
                  </Button>
                ) : null}
              </div>
              {'question' in result && result.question ? (
                <p className="mt-2 font-medium">{String(result.question)}</p>
              ) : null}
              <p className="mt-2 text-muted-foreground">
                Expected: {result.expectedAnswer}
              </p>
              <p className="mt-1 text-muted-foreground">
                Actual: {result.actualAnswer ?? result.error ?? '—'}
              </p>
              {result.traceId ? (
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  Trace ID: {result.traceId}
                </p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
