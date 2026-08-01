import {
  EXECUTION_STEP_ORDER,
  formatExecutionStep,
  type ExecutionCheckpoint,
  type ExecutionStatus,
  type ExecutionStep,
} from '@/services/execution.service'
import { cn } from '@/lib/utils'

type CheckpointTimelineProps = {
  status: ExecutionStatus
  currentStep: ExecutionStep
  checkpoints: ExecutionCheckpoint[]
}

type TimelineState = 'completed' | 'running' | 'pending'

function resolveState(
  step: ExecutionStep,
  status: ExecutionStatus,
  currentStep: ExecutionStep,
  completedSteps: Set<ExecutionStep>,
): TimelineState {
  if (completedSteps.has(step)) {
    return 'completed'
  }

  if (status === 'Completed') {
    return 'completed'
  }

  if (
    (status === 'Running' || status === 'Paused' || status === 'Queued') &&
    step === currentStep
  ) {
    return 'running'
  }

  return 'pending'
}

export function CheckpointTimeline({
  status,
  currentStep,
  checkpoints,
}: CheckpointTimelineProps) {
  const completedSteps = new Set(checkpoints.map((checkpoint) => checkpoint.step))
  const includeParsing =
    currentStep === 'ParsingDocument' ||
    checkpoints.some((checkpoint) => checkpoint.step === 'ParsingDocument')
  const steps = includeParsing
    ? EXECUTION_STEP_ORDER
    : EXECUTION_STEP_ORDER.filter((step) => step !== 'ParsingDocument')

  return (
    <ol className="space-y-2">
      {steps.map((step) => {
        const state = resolveState(step, status, currentStep, completedSteps)
        const checkpoint = checkpoints.find((item) => item.step === step)

        return (
          <li
            key={step}
            className="flex items-start justify-between gap-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-5 w-5 items-center justify-center rounded-full text-xs',
                  state === 'completed' && 'bg-emerald-100 text-emerald-800',
                  state === 'running' && 'bg-blue-100 text-blue-800',
                  state === 'pending' && 'bg-muted text-muted-foreground',
                )}
              >
                {state === 'completed' ? '✓' : state === 'running' ? '•' : '○'}
              </span>
              <div>
                <p
                  className={cn(
                    state === 'pending'
                      ? 'text-muted-foreground'
                      : 'text-foreground',
                  )}
                >
                  {formatExecutionStep(step)}
                </p>
                {checkpoint ? (
                  <p className="text-xs text-muted-foreground">
                    {new Date(checkpoint.completedAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>
            <span className="text-xs text-muted-foreground capitalize">
              {status === 'Paused' && step === currentStep
                ? 'Paused'
                : state === 'completed'
                  ? 'Completed'
                  : state === 'running'
                    ? status === 'Running'
                      ? 'Running'
                      : status
                    : 'Pending'}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
