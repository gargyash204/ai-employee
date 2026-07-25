import { useCallback, useEffect, useState } from 'react'
import {
  getObservabilityOverview,
  type ActivityFeedItem,
  type ObservabilityOverview,
} from '@/services/observability.service'
import { ActivityDetailsModal } from './ActivityDetailsModal'
import { ActivityFeed } from './ActivityFeed'
import { AnalyticsCard } from './AnalyticsCard'
import { RuntimeSummaryCard } from './RuntimeSummaryCard'

const PAGE_SIZE = 20

type OverviewPageProps = {
  runtimeId: string
}

export function OverviewPage({ runtimeId }: OverviewPageProps) {
  const [overview, setOverview] = useState<ObservabilityOverview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<ActivityFeedItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getObservabilityOverview(runtimeId, {
        limit: PAGE_SIZE,
        offset: 0,
      })
      setOverview(data)
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load observability data',
      )
    } finally {
      setLoading(false)
    }
  }, [runtimeId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleLoadMore() {
    if (!overview) {
      return
    }

    setLoadingMore(true)
    try {
      const next = await getObservabilityOverview(runtimeId, {
        limit: PAGE_SIZE,
        offset: overview.activity.length,
      })
      setOverview({
        ...next,
        activity: [...overview.activity, ...next.activity],
      })
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Failed to load more activity',
      )
    } finally {
      setLoadingMore(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading overview…</p>
  }

  if (error && !overview) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    )
  }

  if (!overview) {
    return null
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <RuntimeSummaryCard summary={overview.summary} />
      <AnalyticsCard statistics={overview.statistics} />
      <ActivityFeed
        activities={overview.activity}
        total={overview.activityTotal}
        loadingMore={loadingMore}
        onLoadMore={() => void handleLoadMore()}
        onViewDetails={setSelected}
      />

      <ActivityDetailsModal
        activity={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
          }
        }}
      />
    </div>
  )
}
