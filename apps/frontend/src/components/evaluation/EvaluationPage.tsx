import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  createCase,
  createDataset,
  deleteCase,
  getDataset,
  getEvaluationHistory,
  getEvaluationRun,
  listDatasets,
  updateCase,
  type EvaluationCase,
  type EvaluationDataset,
  type EvaluationResult,
  type EvaluationRunDetail,
  type EvaluationRunSummary,
} from '@/services/evaluation.service'
import { DatasetManager } from './DatasetManager'
import { DatasetSelector } from './DatasetSelector'
import { EvaluationHistory } from './EvaluationHistory'
import { EvaluationResultDrawer } from './EvaluationResultDrawer'
import { EvaluationResultsTable } from './EvaluationResultsTable'
import { ScoreCard } from './ScoreCard'

type EvaluationPageProps = {
  runtimeId: string
  initialRunId?: string | null
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
    if (Array.isArray(message) && message.length > 0) {
      return String(message[0])
    }
  }
  return fallback
}

function formatRunContext(run: EvaluationRunDetail) {
  const versionLabel =
    run.runtimeVersionNumber !== null
      ? `${run.runtimeVersionStatus ?? 'Version'} v${run.runtimeVersionNumber}`
      : 'Unknown version'

  return `${run.datasetName} · ${versionLabel} · ${run.status}`
}

export function EvaluationPage({
  runtimeId,
  initialRunId = null,
}: EvaluationPageProps) {
  const [datasets, setDatasets] = useState<EvaluationDataset[]>([])
  const [cases, setCases] = useState<EvaluationCase[]>([])
  const [history, setHistory] = useState<EvaluationRunSummary[]>([])

  const [datasetId, setDatasetId] = useState('')

  const [loading, setLoading] = useState(true)
  const [creatingDataset, setCreatingDataset] = useState(false)
  const [savingCase, setSavingCase] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeRun, setActiveRun] = useState<EvaluationRunDetail | null>(null)
  const [selectedResult, setSelectedResult] = useState<EvaluationResult | null>(
    null,
  )
  const [drawerOpen, setDrawerOpen] = useState(false)

  const datasetHistory = useMemo(
    () =>
      datasetId
        ? history.filter((run) => run.datasetId === datasetId)
        : history,
    [history, datasetId],
  )

  const loadBase = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [datasetData, historyData] = await Promise.all([
        listDatasets(runtimeId),
        getEvaluationHistory(runtimeId),
      ])

      setDatasets(datasetData)
      setHistory(historyData)

      const nextDatasetId = datasetData[0]?.id ?? ''
      setDatasetId((current) =>
        datasetData.some((dataset) => dataset.id === current)
          ? current
          : nextDatasetId,
      )
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load datasets'))
    } finally {
      setLoading(false)
    }
  }, [runtimeId])

  const loadDatasetCases = useCallback(async (id: string) => {
    if (!id) {
      setCases([])
      return
    }

    try {
      const detail = await getDataset(id)
      setCases(detail.cases)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load dataset cases'))
      setCases([])
    }
  }, [])

  const loadRun = useCallback(async (runId: string) => {
    try {
      const run = await getEvaluationRun(runId)
      setActiveRun(run)
      setDatasetId(run.datasetId)
      setSelectedResult(null)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load evaluation run'))
    }
  }, [])

  useEffect(() => {
    void loadBase()
  }, [loadBase])

  useEffect(() => {
    void loadDatasetCases(datasetId)
  }, [datasetId, loadDatasetCases])

  useEffect(() => {
    if (!initialRunId) {
      return
    }
    void loadRun(initialRunId)
  }, [initialRunId, loadRun])

  useEffect(() => {
    setActiveRun((run) => {
      if (!run || run.datasetId === datasetId) {
        return run
      }
      return null
    })
    setSelectedResult(null)
  }, [datasetId])

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading datasets…</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium">Dataset Manager</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Curate datasets and review regression history. Run regressions from
          Development Studio.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <DatasetSelector
        id="dataset-manager-dataset"
        label="Active dataset"
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
      />

      <DatasetManager
        datasets={datasets}
        selectedDatasetId={datasetId}
        cases={cases}
        creatingDataset={creatingDataset}
        savingCase={savingCase}
        onCreateDataset={async (input) => {
          setCreatingDataset(true)
          setError(null)
          try {
            const created = await createDataset({
              runtimeId,
              name: input.name,
              description: input.description,
            })
            const nextDatasets = await listDatasets(runtimeId)
            setDatasets(nextDatasets)
            setDatasetId(created.id)
          } catch (err) {
            setError(getErrorMessage(err, 'Failed to create dataset'))
            throw err
          } finally {
            setCreatingDataset(false)
          }
        }}
        onCreateCase={async (input) => {
          if (!datasetId) {
            return
          }
          setSavingCase(true)
          setError(null)
          try {
            await createCase({ datasetId, ...input })
            await loadDatasetCases(datasetId)
          } catch (err) {
            setError(getErrorMessage(err, 'Failed to create test case'))
            throw err
          } finally {
            setSavingCase(false)
          }
        }}
        onUpdateCase={async (id, input) => {
          setSavingCase(true)
          setError(null)
          try {
            await updateCase(id, input)
            await loadDatasetCases(datasetId)
          } catch (err) {
            setError(getErrorMessage(err, 'Failed to update test case'))
            throw err
          } finally {
            setSavingCase(false)
          }
        }}
        onDeleteCase={async (id) => {
          setError(null)
          try {
            await deleteCase(id)
            await loadDatasetCases(datasetId)
          } catch (err) {
            setError(getErrorMessage(err, 'Failed to delete test case'))
          }
        }}
      />

      <section className="space-y-4 rounded-md border p-4">
        <div>
          <h3 className="text-sm font-medium">Run history</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Review completed and failed regressions for this dataset.
          </p>
        </div>

        {activeRun ? (
          <p className="text-sm text-muted-foreground">
            Viewing:{' '}
            <span className="text-foreground">
              {formatRunContext(activeRun)}
            </span>
            {` · ${activeRun.score}%`}
          </p>
        ) : null}

        <ScoreCard
          score={activeRun?.score ?? null}
          passed={activeRun?.passed ?? null}
          failed={activeRun?.failed ?? null}
        />

        <EvaluationHistory
          runs={datasetHistory}
          selectedRunId={activeRun?.id ?? null}
          onSelect={(runId) => {
            void loadRun(runId)
          }}
        />

        <EvaluationResultsTable
          results={activeRun?.results ?? []}
          selectedResultId={selectedResult?.id ?? null}
          onSelect={(result) => {
            setSelectedResult(result)
            setDrawerOpen(true)
          }}
        />
      </section>

      <EvaluationResultDrawer
        result={selectedResult}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}
