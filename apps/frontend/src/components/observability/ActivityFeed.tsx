import { Button } from '@/components/ui/button'
import type { ActivityFeedItem } from '@/services/observability.service'
import { ActivityCard } from './ActivityCard'

type ActivityFeedProps = {
  activities: ActivityFeedItem[]
  total: number
  loadingMore: boolean
  onLoadMore: () => void
  onViewDetails: (activity: ActivityFeedItem) => void
}

export function ActivityFeed({
  activities,
  total,
  loadingMore,
  onLoadMore,
  onViewDetails,
}: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <section className="rounded-lg border p-5">
        <h3 className="text-sm font-semibold tracking-tight">Recent Activity</h3>
        <p className="mt-4 text-sm text-muted-foreground">
          No activity yet. Update a draft, run Development Studio, or execute a
          runtime to populate the feed.
        </p>
      </section>
    )
  }

  const hasMore = activities.length < total

  return (
    <section className="rounded-lg border p-5">
      <h3 className="text-sm font-semibold tracking-tight">Recent Activity</h3>
      <div className="mt-2">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
      {hasMore ? (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </section>
  )
}
