import { Button } from '@/components/ui/button'
import type {
  ExecutionStatus,
  ExecutionStep,
} from '@/services/execution.service'
import type { LangfuseTelemetry } from '@/services/observability.service'
import { CheckpointTimeline } from './CheckpointTimeline'
import { CollapsibleSection } from './CollapsibleSection'
import { PromptViewer } from './PromptViewer'
import { ResponseViewer } from './ResponseViewer'
import { TokenMetrics } from './TokenMetrics'

type ExecutionDetailsProps = {
  details: Record<string, unknown>
  telemetry: LangfuseTelemetry | null
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function asNumber(value: unknown) {
  return typeof value === 'number' ? value : null
}

export function ExecutionDetails({
  details,
  telemetry,
}: ExecutionDetailsProps) {
  const checkpoints = Array.isArray(details.checkpoints)
    ? (details.checkpoints as Array<{
        id: string
        step: ExecutionStep
        output: Record<string, unknown>
        completedAt: string
      }>)
    : []

  const status = (asString(details.executionStatus) ??
    'Queued') as ExecutionStatus
  const currentStep = (asString(details.currentStep) ??
    'Queued') as ExecutionStep
  const langfuseUrl =
    asString(details.langfuseUrl) ?? telemetry?.langfuseUrl ?? null

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Execution Status</dt>
        <dd>{status}</dd>
        <dt className="text-muted-foreground">Runtime Version</dt>
        <dd>
          {details.runtimeVersionNumber != null
            ? `v${String(details.runtimeVersionNumber)}`
            : '—'}
        </dd>
        <dt className="text-muted-foreground">Duration</dt>
        <dd>
          {asNumber(details.durationMs) != null
            ? `${asNumber(details.durationMs)} ms`
            : '—'}
        </dd>
        <dt className="text-muted-foreground">Current Step</dt>
        <dd>{currentStep}</dd>
        <dt className="text-muted-foreground">Retry Count</dt>
        <dd>{asNumber(details.retryCount) ?? 0}</dd>
        <dt className="text-muted-foreground">Trace ID</dt>
        <dd className="break-all text-xs">
          {asString(details.traceId) ?? telemetry?.traceId ?? '—'}
        </dd>
      </dl>

      <div>
        <h4 className="mb-2 text-sm font-medium">Checkpoint Timeline</h4>
        <CheckpointTimeline
          status={status}
          currentStep={currentStep}
          checkpoints={checkpoints}
        />
      </div>

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
          {asString(details.document) || '—'}
        </pre>
      </CollapsibleSection>

      <CollapsibleSection title="Structured Output">
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
          {details.structuredOutput
            ? JSON.stringify(details.structuredOutput, null, 2)
            : '—'}
        </pre>
      </CollapsibleSection>

      <CollapsibleSection title="Prompt">
        <PromptViewer
          prompt={asString(details.prompt) ?? telemetry?.prompt}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Response" defaultOpen>
        <ResponseViewer
          response={asString(details.response) ?? telemetry?.response}
        />
      </CollapsibleSection>

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
