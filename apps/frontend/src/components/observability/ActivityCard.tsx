import { Button } from '@/components/ui/button'
import type { ActivityFeedItem } from '@/services/observability.service'

type ActivityCardProps = {
  activity: ActivityFeedItem
  onViewDetails: (activity: ActivityFeedItem) => void
}

export function ActivityCard({ activity, onViewDetails }: ActivityCardProps) {
  const time = new Date(activity.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const langfuseUrl = activity.langfuseUrl ?? null

  return (
    <div className="flex items-start justify-between gap-4 border-b py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-xs text-muted-foreground">
            {time}
          </span>
          <div>
            <p className="text-sm font-medium">{activity.title}</p>
            {activity.description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {activity.description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        {langfuseUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={langfuseUrl} target="_blank" rel="noreferrer">
              View Trace
            </a>
          </Button>
        ) : null}
        {activity.hasDetails ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(activity)}
          >
            View Details
          </Button>
        ) : null}
      </div>
    </div>
  )
}
