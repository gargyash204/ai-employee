import type { RuntimeSummary } from '@/services/observability.service'

type RuntimeSummaryCardProps = {
  summary: RuntimeSummary
}

export function RuntimeSummaryCard({ summary }: RuntimeSummaryCardProps) {
  const items: Array<[string, string]> = [
    ['Status', summary.status],
    [
      'Published',
      summary.publishedVersion != null ? `v${summary.publishedVersion}` : '—',
    ],
    [
      'Draft Version',
      summary.draftVersion != null ? `v${summary.draftVersion}` : '—',
    ],
    ['Executions', String(summary.executions)],
    [
      'Latest Evaluation',
      summary.latestEvaluationScore != null
        ? `${summary.latestEvaluationScore}%`
        : '—',
    ],
  ]

  return (
    <section className="rounded-lg border p-5">
      <h3 className="text-sm font-semibold tracking-tight">Runtime Summary</h3>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
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
