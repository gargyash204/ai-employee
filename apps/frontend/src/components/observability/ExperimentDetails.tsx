import { Button } from '@/components/ui/button'
import type { LangfuseTelemetry } from '@/services/observability.service'
import { CollapsibleSection } from './CollapsibleSection'
import { PromptViewer } from './PromptViewer'
import { ResponseViewer } from './ResponseViewer'
import { TokenMetrics } from './TokenMetrics'

type ExperimentDetailsProps = {
  details: Record<string, unknown>
  telemetry: LangfuseTelemetry | null
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

export function ExperimentDetails({
  details,
  telemetry,
}: ExperimentDetailsProps) {
  const document = asString(details.document)
  const instructions =
    asString(details.instructionsA) ?? asString(details.instructions)
  const structuredOutput =
    details.structuredOutputA ?? details.structuredOutput ?? null
  const prompt = telemetry?.prompt ?? null
  const response =
    telemetry?.response ??
    asString(details.summaryA) ??
    asString(details.actualAnswer)
  const langfuseUrl =
    asString(details.langfuseUrl) ?? telemetry?.langfuseUrl ?? null

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Runtime Version</dt>
        <dd>
          {details.versionANumber != null
            ? `v${String(details.versionANumber)}`
            : '—'}
        </dd>
        <dt className="text-muted-foreground">Trace ID</dt>
        <dd className="break-all text-xs">
          {asString(details.traceIdA) ??
            asString(details.traceId) ??
            telemetry?.traceId ??
            '—'}
        </dd>
      </dl>

      <TokenMetrics
        latencyMs={asNumber(details.latencyMs) ?? telemetry?.latencyMs}
        model={asString(details.model) ?? telemetry?.model}
        provider={asString(details.provider) ?? telemetry?.provider}
        inputTokens={asNumber(details.inputTokens) ?? telemetry?.inputTokens}
        outputTokens={asNumber(details.outputTokens) ?? telemetry?.outputTokens}
        totalTokens={asNumber(details.totalTokens) ?? telemetry?.totalTokens}
        cost={asNumber(details.cost) ?? telemetry?.cost}
      />

      <CollapsibleSection title="Document">
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
          {document || '—'}
        </pre>
      </CollapsibleSection>

      <CollapsibleSection title="Runtime Instructions">
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
          {instructions || '—'}
        </pre>
      </CollapsibleSection>

      <CollapsibleSection title="Structured Output">
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
          {structuredOutput
            ? JSON.stringify(structuredOutput, null, 2)
            : '—'}
        </pre>
      </CollapsibleSection>

      <CollapsibleSection title="Prompt">
        <PromptViewer prompt={prompt} />
      </CollapsibleSection>

      <CollapsibleSection title="Response" defaultOpen>
        <ResponseViewer response={response} />
      </CollapsibleSection>

      {details.question ? (
        <div className="text-sm">
          <p className="font-medium">Question</p>
          <p className="mt-1 text-muted-foreground">
            {asString(details.question)}
          </p>
          <p className="mt-3 font-medium">Expected Answer</p>
          <p className="mt-1 text-muted-foreground">
            {asString(details.expectedAnswer)}
          </p>
          <p className="mt-3 font-medium">Actual Answer</p>
          <p className="mt-1 text-muted-foreground">
            {asString(details.actualAnswer)}
          </p>
        </div>
      ) : null}

      {!telemetry?.available && telemetry?.error ? (
        <p className="text-sm text-muted-foreground">{telemetry.error}</p>
      ) : null}

      {langfuseUrl ? (
        <Button asChild variant="outline" size="sm">
          <a href={langfuseUrl} target="_blank" rel="noreferrer">
            Open in Langfuse
          </a>
        </Button>
      ) : null}
    </div>
  )
}
