import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  AI_PROVIDER,
  type AiProvider,
} from '../../../ai-provider/ai-provider.interface';
import { LangfuseService } from '../../../langfuse/langfuse.service';
import { ExecutionStep } from '../../../../repositories/execution/execution.entity';
import {
  buildProductionAnswerMessages,
  parseProductionAnswers,
} from '../../execution.prompts';
import {
  StepExecutor,
  StepExecutorResult,
  ExecutionStepContext,
} from '../step-executor.interface';

@Injectable()
export class AnswerExecutor implements StepExecutor {
  readonly step = ExecutionStep.GenerateAnswers;

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly langfuseService: LangfuseService,
  ) {}

  async execute(context: ExecutionStepContext): Promise<StepExecutorResult> {
    if (!context.extraction) {
      throw new BadRequestException(
        'Cannot generate answers without extraction output',
      );
    }

    const messages = buildProductionAnswerMessages({
      instructions: context.instructions,
      summary: context.extraction.summary,
      structuredData: context.extraction.structuredData,
    });

    const instrumented = await this.langfuseService.instrumentComplete(
      this.aiProvider,
      {
        name: 'execution.answers',
        messages,
        instructions: context.instructions,
        metadata: {
          runtimeId: context.runtimeId,
          runtimeVersionId: context.runtimeVersionId,
          executionId: context.executionId,
          operation: 'question',
        },
      },
    );

    const answers = parseProductionAnswers(instrumented.completion.content);

    return {
      output: {
        ...answers,
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
      contextPatch: { answers },
    };
  }
}
