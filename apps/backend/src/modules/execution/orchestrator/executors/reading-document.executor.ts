import { Injectable } from '@nestjs/common';
import { ExecutionStep } from '../../../../repositories/execution/execution.entity';
import {
  StepExecutor,
  StepExecutorResult,
  ExecutionStepContext,
} from '../step-executor.interface';

@Injectable()
export class ReadingDocumentExecutor implements StepExecutor {
  readonly step = ExecutionStep.ReadingDocument;

  async execute(context: ExecutionStepContext): Promise<StepExecutorResult> {
    const normalizedDocument = context.document
      .replace(/\r\n/g, '\n')
      .trim();

    const output = {
      characterCount: normalizedDocument.length,
      lineCount: normalizedDocument.length
        ? normalizedDocument.split('\n').length
        : 0,
      preview: normalizedDocument.slice(0, 240),
    };

    return {
      output,
      contextPatch: { normalizedDocument },
    };
  }
}
