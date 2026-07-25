import { useCallback, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import {
  runExperiment,
  type RunExperimentResult,
} from '@/services/experiment.service'
import {
  getDataset,
  listDatasets,
  type EvaluationDataset,
} from '@/services/evaluation.service'
import {
  listRuntimeVersions,
  type RuntimeVersion,
} from '@/services/runtime-version.service'
import { ComparisonToggle } from './ComparisonToggle'
import { ComparisonView } from './ComparisonView'
import { DocumentEditor } from './DocumentEditor'
import { RegressionPanel } from './RegressionPanel'
import { RunButton } from './RunButton'
import { VersionSelector } from './VersionSelector'

type DevelopmentStudioPageProps = {
  runtimeId: string
  onOpenEvaluationReport?: (runId: string) => void
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

function formatVersionLabel(version: RuntimeVersion | undefined) {
  if (!version) {
    return 'Version'
  }
  return `${version.status} v${version.version}`
}

function pickDefaultDataset(datasets: EvaluationDataset[]) {
  return (
    datasets.find((dataset) => dataset.name === 'Default')?.id ??
    datasets[0]?.id ??
    ''
  )
}

export function DevelopmentStudioPage({
  runtimeId,
  onOpenEvaluationReport,
}: DevelopmentStudioPageProps) {
  const [versions, setVersions] = useState<RuntimeVersion[]>([])
  const [datasets, setDatasets] = useState<EvaluationDataset[]>([])
  const [datasetCaseCount, setDatasetCaseCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [versionAId, setVersionAId] = useState('')
  const [versionBId, setVersionBId] = useState('')
  const [compareEnabled, setCompareEnabled] = useState(false)
  const [document, setDocument] = useState('')
  const [datasetId, setDatasetId] = useState('')
  const [runEvaluationAfter, setRunEvaluationAfter] = useState(true)

  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RunExperimentResult | null>(null)
  const [evaluationRunId, setEvaluationRunId] = useState<string | null>(null)

  const loadBase = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [versionData, datasetData] = await Promise.all([
        listRuntimeVersions(runtimeId),
        listDatasets(runtimeId),
      ])

      setVersions(versionData)
      setDatasets(datasetData)

      const draft = versionData.find((version) => version.status === 'Draft')
      const published = versionData.find(
        (version) => version.status === 'Published',
      )

      setVersionAId(draft?.id ?? versionData[0]?.id ?? '')
      if (draft && published) {
        setCompareEnabled(true)
        setVersionBId(published.id)
      } else {
        setCompareEnabled(false)
        setVersionBId('')
      }

      const nextDatasetId = pickDefaultDataset(datasetData)
      setDatasetId(nextDatasetId)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load Development Studio'))
    } finally {
      setLoading(false)
    }
  }, [runtimeId])

  useEffect(() => {
    void loadBase()
  }, [loadBase])

  useEffect(() => {
    if (!datasetId) {
      setDatasetCaseCount(0)
      setRunEvaluationAfter(false)
      return
    }

    getDataset(datasetId)
      .then((detail) => {
        const count = detail.cases.length
        setDatasetCaseCount(count)
        setRunEvaluationAfter(count > 0)
      })
      .catch(() => {
        setDatasetCaseCount(0)
        setRunEvaluationAfter(false)
      })
  }, [datasetId])

  const versionA = useMemo(
    () => versions.find((version) => version.id === versionAId),
    [versions, versionAId],
  )
  const versionB = useMemo(
    () => versions.find((version) => version.id === versionBId),
    [versions, versionBId],
  )

  const versionBOptions = useMemo(
    () => versions.filter((version) => version.id !== versionAId),
    [versions, versionAId],
  )

  async function handleRun() {
    setRunning(true)
    setError(null)
    setResult(null)
    setEvaluationRunId(null)

    try {
      const shouldRunEval =
        runEvaluationAfter && Boolean(datasetId) && datasetCaseCount > 0

      const next = await runExperiment({
        versionAId,
        versionBId: compareEnabled && versionBId ? versionBId : undefined,
        document,
        runEvaluation: shouldRunEval,
        datasetId: shouldRunEval ? datasetId : undefined,
      })

      setResult(next)
      setEvaluationRunId(next.evaluationRunId)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to run experiment'))
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        Loading Development Studio…
      </p>
    )
  }

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Create a runtime version before using Development Studio.
      </p>
    )
  }

  const canRun =
    Boolean(versionAId) &&
    document.trim().length > 0 &&
    (!compareEnabled || Boolean(versionBId))

  return (
    <div className="space-y-8">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Version Selection</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Version A is required. Version B is optional for side-by-side
            comparison.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <VersionSelector
            id="studio-version-a"
            label="Version A"
            versions={versions}
            value={versionAId}
            disabled={running}
            onChange={(id) => {
              setVersionAId(id)
              if (id === versionBId) {
                setVersionBId('')
              }
            }}
          />
          {compareEnabled ? (
            <VersionSelector
              id="studio-version-b"
              label="Version B (Optional)"
              versions={versionBOptions}
              value={versionBId}
              allowEmpty
              emptyLabel="Select version"
              disabled={running}
              onChange={setVersionBId}
            />
          ) : null}
        </div>
        <ComparisonToggle
          enabled={compareEnabled}
          disabled={running || versions.length < 2}
          onChange={(enabled) => {
            setCompareEnabled(enabled)
            if (!enabled) {
              setVersionBId('')
            }
          }}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">Experiment</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a document, run extraction, and inspect outputs immediately.
          </p>
        </div>

        <DocumentEditor
          value={document}
          disabled={running}
          onChange={setDocument}
        />

        <RunButton
          loading={running}
          disabled={!canRun}
          onClick={() => void handleRun()}
        />

        {result ? (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Results</h4>
            <ComparisonView
              versionALabel={formatVersionLabel(versionA)}
              versionA={result.versionA}
              versionBLabel={
                result.versionB ? formatVersionLabel(versionB) : undefined
              }
              versionB={result.versionB}
            />
          </div>
        ) : null}
      </section>

      <RegressionPanel
        datasets={datasets}
        datasetId={datasetId}
        onDatasetChange={setDatasetId}
        runEvaluationAfter={runEvaluationAfter}
        onRunEvaluationAfterChange={setRunEvaluationAfter}
        versionAId={versionAId}
        versionBId={compareEnabled ? versionBId : ''}
        evaluationRunId={evaluationRunId}
        disabled={running}
        onOpenReport={(runId) => {
          onOpenEvaluationReport?.(runId)
        }}
      />
    </div>
  )
}

/** @deprecated Use DevelopmentStudioPage */
export const ExperimentPage = DevelopmentStudioPage
