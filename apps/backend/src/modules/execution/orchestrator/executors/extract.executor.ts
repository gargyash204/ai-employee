import { Inject, Injectable } from '@nestjs/common';
import {
  AI_PROVIDER,
  type AiProvider,
} from '../../../ai-provider/ai-provider.interface';
import { LangfuseService } from '../../../langfuse/langfuse.service';
import {
  buildExtractionMessages,
  parseExtractionResponse,
} from '../../../experiment/experiment.prompts';
import { ExecutionStep } from '../../../../repositories/execution/execution.entity';
import {
  StepExecutor,
  StepExecutorResult,
  ExecutionStepContext,
} from '../step-executor.interface';

@Injectable()
export class ExtractExecutor implements StepExecutor {
  readonly step = ExecutionStep.ExtractStructuredData;

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly langfuseService: LangfuseService,
  ) {}

  async execute(context: ExecutionStepContext): Promise<StepExecutorResult> {
    const document = context.normalizedDocument ?? context.document;
    const messages = buildExtractionMessages({
      instructions: context.instructions,
      document,
    });

    const instrumented = await this.langfuseService.instrumentComplete(
      this.aiProvider,
      {
        name: 'execution.extract',
        messages,
        instructions: context.instructions,
        document,
        json: true,
        metadata: {
          runtimeId: context.runtimeId,
          runtimeVersionId: context.runtimeVersionId,
          executionId: context.executionId,
          operation: 'extract',
        },
      },
    );

    const extraction = parseExtractionResponse(
      instrumented.completion.content,
      { traceId: instrumented.traceId },
    );

    return {
      output: {
        summary: extraction.summary,
        structuredData: extraction.structuredData,
        traceId: instrumented.traceId,
        latencyMs: instrumented.latencyMs,
        model: instrumented.completion.model,
        provider: instrumented.completion.provider,
        inputTokens: instrumented.completion.usage.inputTokens,
        outputTokens: instrumented.completion.usage.outputTokens,
        totalTokens: instrumented.completion.usage.totalTokens,
        prompt: messages.map((m) => `${m.role}: ${m.content}`).join('\n\n'),
        response: instrumented.completion.content,
      },
      contextPatch: { extraction },
    };
  }
}
