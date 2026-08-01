import {
  ExecutionStatus,
  ExecutionStep,
} from '../../repositories/execution/execution.entity';

export type ExecutionCheckpointResponse = {
  id: string;
  step: ExecutionStep;
  output: Record<string, unknown>;
  completedAt: string;
};

export type ExecutionSummaryResponse = {
  id: string;
  runtimeId: string;
  runtimeVersionId: string;
  runtimeVersionNumber: number | null;
  runtimeVersionStatus: string | null;
  status: ExecutionStatus;
  currentStep: ExecutionStep;
  retryCount: number;
  startedAt: string;
  completedAt: string | null;
};

export type ExecutionDetailResponse = ExecutionSummaryResponse & {
  document: string;
  parserError: string | null;
  finalOutput: Record<string, unknown> | null;
  checkpoints: ExecutionCheckpointResponse[];
};
