import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  compareVersions,
  getEvaluationRun,
  type CompareVersionsResult,
  type EvaluationDataset,
  type EvaluationRunDetail,
} from '@/services/evaluation.service'
import { DatasetSelector } from '@/components/evaluation/DatasetSelector'

type RegressionPanelProps = {
  datasets: EvaluationDataset[]
  datasetId: string
  onDatasetChange: (datasetId: string) => void
  runEvaluationAfter: boolean
  onRunEvaluationAfterChange: (value: boolean) => void
  versionAId: string
  versionBId: string
  evaluationRunId: string | null
  disabled?: boolean
  onOpenReport: (runId: string) => void
}

const INITIAL_POLL_MS = 2000
const MAX_POLL_MS = 30_000

function nextPollDelay(attempt: number) {
  return Math.min(INITIAL_POLL_MS * 2 ** attempt, MAX_POLL_MS)
}

export function RegressionPanel({
  datasets,
  datasetId,
  onDatasetChange,
  runEvaluationAfter,
  onRunEvaluationAfterChange,
  versionAId,
  versionBId,
  evaluationRunId,
  disabled = false,
  onOpenReport,
}: RegressionPanelProps) {
  const [run, setRun] = useState<EvaluationRunDetail | null>(null)
  const [comparison, setComparison] = useState<CompareVersionsResult | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [polling, setPolling] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const versionAIdRef = useRef(versionAId)
  const versionBIdRef = useRef(versionBId)

  versionAIdRef.current = versionAId
  versionBIdRef.current = versionBId

  useEffect(() => {
    setRun(null)
    setComparison(null)
    setError(null)
    setPolling(false)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (!evaluationRunId) {
      return
    }

    let cancelled = false
    let attempt = 0
    setPolling(true)

    function scheduleNext() {
      const delay = nextPollDelay(attempt)
      attempt += 1
      timeoutRef.current = setTimeout(() => {
        void poll()
      }, delay)
    }

    async function poll() {
      if (!evaluationRunId || cancelled) {
        return
      }

      try {
        const detail = await getEvaluationRun(evaluationRunId)
        if (cancelled) {
          return
        }

        setRun(detail)
        setError(null)

        if (detail.status === 'Completed' || detail.status === 'Failed') {
          setPolling(false)

          if (detail.status === 'Completed' && versionBIdRef.current) {
            try {
              const compare = await compareVersions({
                runtimeVersionA: versionBIdRef.current,
                runtimeVersionB: versionAIdRef.current,
                datasetId: detail.datasetId,
              })
              if (!cancelled) {
                setComparison(compare)
              }
            } catch {
              if (!cancelled) {
                setComparison(null)
              }
            }
          }
          return
        }

        scheduleNext()
      } catch (err: unknown) {
        if (cancelled) {
          return
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load regression status',
        )
        scheduleNext()
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [evaluationRunId])

  const selectedDataset = datasets.find((dataset) => dataset.id === datasetId)
  const canEnable =
    Boolean(datasetId) && datasets.length > 0 && Boolean(selectedDataset)
  const showSetup = !evaluationRunId

  return (
    <section className="space-y-4 rounded-md border p-4">
      <div>
        <h3 className="text-sm font-medium">Regression</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {showSetup
            ? 'Optionally score Version A against a dataset after the experiment.'
            : 'Regression results for this run.'}
        </p>
      </div>

      {showSetup ? (
        <>
          <DatasetSelector
            id="regression-dataset"
            datasets={datasets}
            value={datasetId}
            onChange={onDatasetChange}
            disabled={disabled}
          />

          <div className="flex items-center gap-2">
            <input
              id="run-evaluation-after"
              type="checkbox"
              className="size-4 rounded border border-input"
              checked={runEvaluationAfter}
              disabled={disabled || !canEnable}
              onChange={(event) =>
                onRunEvaluationAfterChange(event.target.checked)
              }
            />
            <Label htmlFor="run-evaluation-after" className="font-normal">
              Run evaluation after experiment
            </Label>
          </div>
        </>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {evaluationRunId && (polling || run?.status === 'Running') ? (
        <p className="text-sm text-muted-foreground">Running…</p>
      ) : null}

      {run?.status === 'Failed' ? (
        <p className="text-sm text-destructive" role="alert">
          Regression failed. Open the full report for details.
        </p>
      ) : null}

      {run?.status === 'Completed' ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="text-2xl font-semibold tabular-nums">{run.score}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Passed</p>
              <p className="text-2xl font-semibold tabular-nums text-emerald-700">
                {run.passed}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="text-2xl font-semibold tabular-nums text-destructive">
                {run.failed}
              </p>
            </div>
          </div>

          {comparison ? (
            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Improved</p>
                <p className="text-xl font-semibold tabular-nums text-emerald-700">
                  {comparison.improvedCases.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Regressed</p>
                <p className="text-xl font-semibold tabular-nums text-destructive">
                  {comparison.regressedCases.length}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Improved</p>
                <p className="text-xl font-semibold tabular-nums">—</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Regressed</p>
                <p className="text-xl font-semibold tabular-nums">—</p>
              </div>
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenReport(run.id)}
          >
            Open Full Report
          </Button>
        </div>
      ) : null}

      {run?.status === 'Failed' && evaluationRunId ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenReport(evaluationRunId)}
        >
          Open Full Report
        </Button>
      ) : null}
    </section>
  )
}
