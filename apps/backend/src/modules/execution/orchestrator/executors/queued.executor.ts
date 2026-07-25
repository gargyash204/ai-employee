import { Injectable } from '@nestjs/common';
import { ExecutionStep } from '../../../../repositories/execution/execution.entity';
import {
  StepExecutor,
  StepExecutorResult,
  ExecutionStepContext,
} from '../step-executor.interface';

@Injectable()
export class QueuedExecutor implements StepExecutor {
  readonly step = ExecutionStep.Queued;

  async execute(context: ExecutionStepContext): Promise<StepExecutorResult> {
    return {
      output: {
        accepted: true,
        documentLength: context.document.length,
      },
      contextPatch: {},
    };
  }
}
