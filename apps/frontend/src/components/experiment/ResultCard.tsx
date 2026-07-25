import type { ExperimentVersionResult } from '@/services/experiment.service'

type ResultCardProps = {
  title: string
  result: ExperimentVersionResult
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value, null, 2)
}

export function ResultCard({ title, result }: ResultCardProps) {
  const entries = Object.entries(result.structuredData)

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <h4 className="text-sm font-medium">{title}</h4>
        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
          {result.summary}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No structured fields extracted.</p>
      ) : (
        <dl className="space-y-3 text-sm">
          {entries.map(([key, value]) => (
            <div key={key} className="grid gap-1">
              <dt className="font-medium capitalize">{key}</dt>
              <dd className="whitespace-pre-wrap text-muted-foreground">
                {renderValue(value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
