import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Runtime } from '@/services/runtime.service'
import { DevelopmentStudioPage } from '@/components/experiment/ExperimentPage'
import { EvaluationPage } from '@/components/evaluation/EvaluationPage'
import { ExecutionPage } from '@/components/execution/ExecutionPage'
import { OverviewPage } from '@/components/observability/OverviewPage'
import { RuntimeVersions } from './RuntimeVersions'

type RuntimeDetailsProps = {
  runtime: Runtime | null
  loading: boolean
  error: string | null
  hasRuntimes: boolean
  onCreateClick: () => void
  onEditClick: () => void
  onDeleteClick: () => void
}

type TabId =
  | 'overview'
  | 'versions'
  | 'dataset-manager'
  | 'studio'
  | 'executions'

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'versions', label: 'Versions' },
  { id: 'dataset-manager', label: 'Dataset Manager' },
  { id: 'studio', label: 'Development Studio' },
  { id: 'executions', label: 'Executions' },
]

export function RuntimeDetails({
  runtime,
  loading,
  error,
  hasRuntimes,
  onCreateClick,
  onEditClick,
  onDeleteClick,
}: RuntimeDetailsProps) {
  const [tab, setTab] = useState<TabId>('overview')
  const [reportRunId, setReportRunId] = useState<string | null>(null)

  useEffect(() => {
    setTab('overview')
    setReportRunId(null)
  }, [runtime?.id])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Loading runtime…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      </div>
    )
  }

  if (!runtime) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-sm text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            No Runtime Selected
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasRuntimes
              ? 'Select a runtime from the sidebar, or create a new one.'
              : 'Create your first Runtime to begin.'}
          </p>
          <Button className="mt-6" onClick={onCreateClick}>
            Create Runtime
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{runtime.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
            {runtime.description || 'No description'}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={onEditClick}>
            Edit
          </Button>
          <Button variant="destructive" onClick={onDeleteClick}>
            Delete
          </Button>
        </div>
      </div>

      <div
        className="mt-8 flex flex-wrap gap-1 border-b"
        role="tablist"
        aria-label="Runtime sections"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              tab === item.id
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-6" role="tabpanel">
        {tab === 'overview' ? (
          <OverviewPage key={runtime.id} runtimeId={runtime.id} />
        ) : null}

        {tab === 'versions' ? (
          <RuntimeVersions key={runtime.id} runtimeId={runtime.id} />
        ) : null}

        {tab === 'dataset-manager' ? (
          <EvaluationPage
            key={runtime.id}
            runtimeId={runtime.id}
            initialRunId={reportRunId}
          />
        ) : null}

        {tab === 'studio' ? (
          <DevelopmentStudioPage
            key={runtime.id}
            runtimeId={runtime.id}
            onOpenEvaluationReport={(runId) => {
              setReportRunId(runId)
              setTab('dataset-manager')
            }}
          />
        ) : null}

        {tab === 'executions' ? (
          <ExecutionPage key={runtime.id} runtimeId={runtime.id} />
        ) : null}
      </div>
    </div>
  )
}
