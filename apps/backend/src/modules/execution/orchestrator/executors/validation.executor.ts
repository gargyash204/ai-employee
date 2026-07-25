import { BadRequestException, Injectable } from '@nestjs/common';
import { ExecutionStep } from '../../../../repositories/execution/execution.entity';
import {
  StepExecutor,
  StepExecutorResult,
  ExecutionStepContext,
} from '../step-executor.interface';

@Injectable()
export class ValidationExecutor implements StepExecutor {
  readonly step = ExecutionStep.ValidateResult;

  async execute(context: ExecutionStepContext): Promise<StepExecutorResult> {
    if (!context.extraction) {
      throw new BadRequestException(
        'Cannot validate without extraction output',
      );
    }

    if (!context.answers) {
      throw new BadRequestException('Cannot validate without answers output');
    }

    const issues: string[] = [];

    if (!context.extraction.summary.trim()) {
      issues.push('Extraction summary is empty');
    }

    if (Object.keys(context.extraction.structuredData).length === 0) {
      issues.push('Structured data is empty');
    }

    const answerMap =
      context.answers.answers &&
      typeof context.answers.answers === 'object' &&
      !Array.isArray(context.answers.answers)
        ? (context.answers.answers as Record<string, unknown>)
        : context.answers;

    if (Object.keys(answerMap).length === 0) {
      issues.push('Generated answers are empty');
    }

    const validation = {
      passed: issues.length === 0,
      issues,
    };

    return {
      output: validation,
      contextPatch: { validation },
    };
  }
}
