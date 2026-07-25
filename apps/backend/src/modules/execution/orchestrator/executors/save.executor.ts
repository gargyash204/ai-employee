import { BadRequestException, Injectable } from '@nestjs/common';
import { ExecutionStep } from '../../../../repositories/execution/execution.entity';
import {
  StepExecutor,
  StepExecutorResult,
  ExecutionStepContext,
} from '../step-executor.interface';

@Injectable()
export class SaveExecutor implements StepExecutor {
  readonly step = ExecutionStep.SaveOutput;

  async execute(context: ExecutionStepContext): Promise<StepExecutorResult> {
    if (!context.extraction || !context.answers || !context.validation) {
      throw new BadRequestException(
        'Cannot save output without prior workflow results',
      );
    }

    const finalOutput = {
      summary: context.extraction.summary,
      structuredData: context.extraction.structuredData,
      answers: context.answers,
      validation: context.validation,
    };

    return {
      output: finalOutput,
      contextPatch: { finalOutput },
    };
  }
}
