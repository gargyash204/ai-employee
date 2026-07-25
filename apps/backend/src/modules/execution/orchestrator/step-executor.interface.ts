import { ExecutionStep } from '../../../repositories/execution/execution.entity';
import type { ExtractionResult } from '../../experiment/experiment.prompts';

export type ExecutionStepContext = {
  executionId: string;
  runtimeId: string;
  runtimeVersionId: string;
  instructions: string;
  document: string;
  retryCount: number;
  normalizedDocument?: string;
  extraction?: ExtractionResult;
  answers?: Record<string, unknown>;
  validation?: {
    passed: boolean;
    issues: string[];
  };
  finalOutput?: Record<string, unknown>;
};

export type StepExecutorResult = {
  output: Record<string, unknown>;
  contextPatch: Partial<ExecutionStepContext>;
};

export interface StepExecutor {
  readonly step: ExecutionStep;
  execute(context: ExecutionStepContext): Promise<StepExecutorResult>;
}
