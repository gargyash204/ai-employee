import { CheckpointTimeline as ExecutionCheckpointTimeline } from '@/components/execution/CheckpointTimeline'
import type {
  ExecutionCheckpoint,
  ExecutionStatus,
  ExecutionStep,
} from '@/services/execution.service'

type ObservabilityCheckpoint = {
  id: string
  step: ExecutionStep
  output: Record<string, unknown>
  completedAt: string
}

type CheckpointTimelineProps = {
  status: ExecutionStatus
  currentStep: ExecutionStep
  checkpoints: ObservabilityCheckpoint[]
}

export function CheckpointTimeline({
  status,
  currentStep,
  checkpoints,
}: CheckpointTimelineProps) {
  const mapped: ExecutionCheckpoint[] = checkpoints.map((checkpoint) => ({
    id: checkpoint.id,
    step: checkpoint.step,
    output: checkpoint.output,
    completedAt: checkpoint.completedAt,
  }))

  return (
    <ExecutionCheckpointTimeline
      status={status}
      currentStep={currentStep}
      checkpoints={mapped}
    />
  )
}
