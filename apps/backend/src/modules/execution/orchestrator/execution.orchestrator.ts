import { Injectable, Logger } from '@nestjs/common';
import { AiProviderError } from '../../ai-provider/ai-provider.error';
import { AuditService } from '../../audit/audit.service';
import {
  AuditEntityType,
  AuditEventType,
} from '../../../repositories/audit-event/audit-event.entity';
import { ExecutionCheckpointRepository } from '../../../repositories/execution-checkpoint/execution-checkpoint.repository';
import {
  ExecutionEntity,
  ExecutionStatus,
  ExecutionStep,
} from '../../../repositories/execution/execution.entity';
import { ExecutionRepository } from '../../../repositories/execution/execution.repository';
import { ExecutionCheckpointEntity } from '../../../repositories/execution-checkpoint/execution-checkpoint.entity';
import type { ExtractionResult } from '../../experiment/experiment.prompts';
import { AnswerExecutor } from './executors/answer.executor';
import { ExtractExecutor } from './executors/extract.executor';
import { QueuedExecutor } from './executors/queued.executor';
import { ReadingDocumentExecutor } from './executors/reading-document.executor';
import { SaveExecutor } from './executors/save.executor';
import { ValidationExecutor } from './executors/validation.executor';
import {
  ExecutionStepContext,
  StepExecutor,
} from './step-executor.interface';

const WORKFLOW_STEPS: ExecutionStep[] = [
  ExecutionStep.Queued,
  ExecutionStep.ReadingDocument,
  ExecutionStep.ExtractStructuredData,
  ExecutionStep.GenerateAnswers,
  ExecutionStep.ValidateResult,
  ExecutionStep.SaveOutput,
];

@Injectable()
export class ExecutionOrchestrator {
  private readonly logger = new Logger(ExecutionOrchestrator.name);
  private readonly executors: Map<ExecutionStep, StepExecutor>;

  constructor(
    private readonly executionRepository: ExecutionRepository,
    private readonly checkpointRepository: ExecutionCheckpointRepository,
    private readonly auditService: AuditService,
    queuedExecutor: QueuedExecutor,
    readingDocumentExecutor: ReadingDocumentExecutor,
    extractExecutor: ExtractExecutor,
    answerExecutor: AnswerExecutor,
    validationExecutor: ValidationExecutor,
    saveExecutor: SaveExecutor,
  ) {
    this.executors = new Map<ExecutionStep, StepExecutor>([
      [ExecutionStep.Queued, queuedExecutor],
      [ExecutionStep.ReadingDocument, readingDocumentExecutor],
      [ExecutionStep.ExtractStructuredData, extractExecutor],
      [ExecutionStep.GenerateAnswers, answerExecutor],
      [ExecutionStep.ValidateResult, validationExecutor],
      [ExecutionStep.SaveOutput, saveExecutor],
    ]);
  }

  async run(
    execution: ExecutionEntity,
    instructions: string,
  ): Promise<ExecutionEntity> {
    const checkpoints = await this.checkpointRepository.findByExecutionId(
      execution.id,
    );
    let context = this.buildContext(execution, instructions, checkpoints);

    let current = execution;
    const startIndex = WORKFLOW_STEPS.indexOf(current.currentStep);

    if (startIndex < 0) {
      return current;
    }

    for (let index = startIndex; index < WORKFLOW_STEPS.length; index += 1) {
      const step = WORKFLOW_STEPS[index];

      const refreshed = await this.executionRepository.findById(current.id);
      if (!refreshed) {
        return current;
      }
      current = refreshed;

      const existingCheckpoint = checkpoints.find(
        (checkpoint) => checkpoint.step === step,
      );
      if (existingCheckpoint) {
        continue;
      }

      current =
        (await this.executionRepository.update(current.id, {
          status: ExecutionStatus.Running,
          currentStep: step,
        })) ?? current;

      this.logEvent(current, step, true, 'Step started');

      const executor = this.executors.get(step);
      if (!executor) {
        return this.pause(current, step, 'No executor registered for step');
      }

      try {
        const result = await executor.execute(context);
        context = { ...context, ...result.contextPatch };

        const checkpoint = await this.checkpointRepository.create({
          executionId: current.id,
          step,
          output: result.output,
        });
        checkpoints.push(checkpoint);

        await this.auditService.record({
          runtimeId: current.runtimeId,
          eventType: AuditEventType.CheckpointCreated,
          entityType: AuditEntityType.ExecutionCheckpoint,
          entityId: checkpoint.id,
          title: 'Checkpoint Created',
          description: step,
          traceId:
            typeof result.output.traceId === 'string'
              ? result.output.traceId
              : null,
          metadata: {
            executionId: current.id,
            step,
            output: result.output,
          },
        });

        const nextStep =
          index + 1 < WORKFLOW_STEPS.length
            ? WORKFLOW_STEPS[index + 1]
            : ExecutionStep.Completed;

        if (step === ExecutionStep.SaveOutput) {
          current =
            (await this.executionRepository.update(current.id, {
              status: ExecutionStatus.Completed,
              currentStep: ExecutionStep.Completed,
              finalOutput: context.finalOutput ?? result.output,
              completedAt: new Date(),
            })) ?? current;
          this.logEvent(current, step, true, 'Execution completed');
          return current;
        }

        current =
          (await this.executionRepository.update(current.id, {
            status: ExecutionStatus.Running,
            currentStep: nextStep,
          })) ?? current;

        this.logEvent(current, step, true, 'Step completed');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown step failure';
        this.logEvent(current, step, false, message);

        const traceId =
          error instanceof AiProviderError ? error.traceId : null;
        const response =
          error instanceof AiProviderError ? error.response : null;

        const paused = await this.pause(current, step, message);

        await this.auditService.record({
          runtimeId: paused.runtimeId,
          eventType: AuditEventType.ExecutionPaused,
          entityType: AuditEntityType.Execution,
          entityId: paused.id,
          title: 'Execution Paused',
          description: message,
          traceId,
          metadata: {
            runtimeVersionId: paused.runtimeVersionId,
            currentStep: step,
            retryCount: paused.retryCount,
            failure: message,
            response,
          },
        });

        return paused;
      }
    }

    return current;
  }

  private async pause(
    execution: ExecutionEntity,
    step: ExecutionStep,
    reason: string,
  ): Promise<ExecutionEntity> {
    const updated =
      (await this.executionRepository.update(execution.id, {
        status: ExecutionStatus.Paused,
        currentStep: step,
        retryCount: execution.retryCount,
      })) ?? execution;

    this.logger.warn(
      JSON.stringify({
        executionId: updated.id,
        runtimeVersionId: updated.runtimeVersionId,
        currentStep: step,
        retryCount: updated.retryCount,
        success: false,
        failure: reason,
      }),
    );

    return updated;
  }

  private buildContext(
    execution: ExecutionEntity,
    instructions: string,
    checkpoints: ExecutionCheckpointEntity[],
  ): ExecutionStepContext {
    const context: ExecutionStepContext = {
      executionId: execution.id,
      runtimeId: execution.runtimeId,
      runtimeVersionId: execution.runtimeVersionId,
      instructions,
      document: execution.document,
      retryCount: execution.retryCount,
    };

    for (const checkpoint of checkpoints) {
      if (checkpoint.step === ExecutionStep.ReadingDocument) {
        context.normalizedDocument = execution.document
          .replace(/\r\n/g, '\n')
          .trim();
      }

      if (checkpoint.step === ExecutionStep.ExtractStructuredData) {
        const summary =
          typeof checkpoint.output.summary === 'string'
            ? checkpoint.output.summary
            : '';
        const structuredData =
          checkpoint.output.structuredData &&
          typeof checkpoint.output.structuredData === 'object' &&
          !Array.isArray(checkpoint.output.structuredData)
            ? (checkpoint.output.structuredData as Record<string, unknown>)
            : {};
        context.extraction = {
          summary,
          structuredData,
        } satisfies ExtractionResult;
      }

      if (checkpoint.step === ExecutionStep.GenerateAnswers) {
        context.answers = checkpoint.output;
      }

      if (checkpoint.step === ExecutionStep.ValidateResult) {
        const issues = Array.isArray(checkpoint.output.issues)
          ? checkpoint.output.issues.map(String)
          : [];
        context.validation = {
          passed: Boolean(checkpoint.output.passed),
          issues,
        };
      }

      if (checkpoint.step === ExecutionStep.SaveOutput) {
        context.finalOutput = checkpoint.output;
      }
    }

    return context;
  }

  private logEvent(
    execution: ExecutionEntity,
    step: ExecutionStep,
    success: boolean,
    message: string,
  ): void {
    const payload = {
      executionId: execution.id,
      runtimeVersionId: execution.runtimeVersionId,
      currentStep: step,
      retryCount: execution.retryCount,
      success,
      message,
    };

    if (success) {
      this.logger.log(JSON.stringify(payload));
      return;
    }

    this.logger.error(JSON.stringify(payload));
  }
}
