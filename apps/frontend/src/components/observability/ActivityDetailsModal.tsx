import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getActivityDetails,
  type ActivityDetails,
  type ActivityFeedItem,
} from '@/services/observability.service'
import { EvaluationDetails } from './EvaluationDetails'
import { ExecutionDetails } from './ExecutionDetails'
import { ExperimentDetails } from './ExperimentDetails'

type ActivityDetailsModalProps = {
  activity: ActivityFeedItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivityDetailsModal({
  activity,
  open,
  onOpenChange,
}: ActivityDetailsModalProps) {
  const [details, setDetails] = useState<ActivityDetails | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !activity) {
      setDetails(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    getActivityDetails(activity.id)
      .then((data) => {
        if (!cancelled) {
          setDetails(data)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load activity details',
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activity, open])

  const kind =
    typeof details?.details.kind === 'string' ? details.details.kind : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{activity?.title ?? 'Activity Details'}</DialogTitle>
          <DialogDescription>
            {activity?.description ?? 'Merged audit and telemetry details'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading details…</p>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        {details && kind === 'experiment' ? (
          <ExperimentDetails
            details={details.details}
            telemetry={details.telemetry}
          />
        ) : null}

        {details && kind === 'evaluation' ? (
          <EvaluationDetails
            details={details.details}
            telemetry={details.telemetry}
          />
        ) : null}

        {details && kind === 'execution' ? (
          <ExecutionDetails
            details={details.details}
            telemetry={details.telemetry}
          />
        ) : null}

        {details && kind === 'generic' ? (
          <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">
            {JSON.stringify(details.details, null, 2)}
          </pre>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
