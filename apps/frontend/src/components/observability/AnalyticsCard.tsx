import type { ObservabilitySummary } from '@/services/observability.service'

type AnalyticsCardProps = {
  statistics: ObservabilitySummary
}

function format(value: number | null, suffix = '') {
  if (value === null || value === undefined) {
    return '—'
  }
  return `${value}${suffix}`
}

export function AnalyticsCard({ statistics }: AnalyticsCardProps) {
  const items: Array<[string, string]> = [
    ['Experiments', String(statistics.experiments)],
    ['Evaluation Runs', String(statistics.evaluations)],
    ['Executions', String(statistics.executions)],
    ['Published Versions', String(statistics.publishedVersions)],
    ['Average Latency', format(statistics.averageLatencyMs, ' ms')],
    ['Average Tokens', format(statistics.averageTokens)],
    ['Average Cost', format(statistics.averageCost, '')],
    [
      'Execution Success Rate',
      format(statistics.executionSuccessRate, '%'),
    ],
    [
      'Evaluation Success Rate',
      format(statistics.evaluationSuccessRate, '%'),
    ],
    [
      'Latest Activity',
      statistics.latestActivityAt
        ? new Date(statistics.latestActivityAt).toLocaleString()
        : '—',
    ],
  ]

  return (
    <section className="rounded-lg border p-5">
      <h3 className="text-sm font-semibold tracking-tight">Analytics</h3>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
