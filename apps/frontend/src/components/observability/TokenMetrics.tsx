type TokenMetricsProps = {
  latencyMs?: number | null
  model?: string | null
  provider?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  totalTokens?: number | null
  cost?: number | null
}

function formatValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  return String(value)
}

export function TokenMetrics({
  latencyMs,
  model,
  provider,
  inputTokens,
  outputTokens,
  totalTokens,
  cost,
}: TokenMetricsProps) {
  const rows: Array<[string, string]> = [
    ['Model', formatValue(model)],
    ['Provider', formatValue(provider)],
    ['Latency', latencyMs != null ? `${latencyMs} ms` : '—'],
    ['Input Tokens', formatValue(inputTokens)],
    ['Output Tokens', formatValue(outputTokens)],
    ['Total Tokens', formatValue(totalTokens)],
    ['Cost', cost != null ? `$${cost}` : '—'],
  ]

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
