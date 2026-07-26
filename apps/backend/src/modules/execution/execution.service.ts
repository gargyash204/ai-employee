import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import {
  AuditEntityType,
  AuditEventType,
} from '../../repositories/audit-event/audit-event.entity';
import { ExecutionCheckpointRepository } from '../../repositories/execution-checkpoint/execution-checkpoint.repository';
import { ExecutionCheckpointEntity } from '../../repositories/execution-checkpoint/execution-checkpoint.entity';
import {
  ExecutionEntity,
  ExecutionStatus,
  ExecutionStep,
} from '../../repositories/execution/execution.entity';
import { ExecutionRepository } from '../../repositories/execution/execution.repository';
import { RuntimeRepository } from '../../repositories/runtime/runtime.repository';
import { RuntimeVersionRepository } from '../../repositories/runtime-version/runtime-version.repository';
import {
  RuntimeVersionEntity,
  RuntimeVersionStatus,
} from '../../repositories/runtime-version/runtime-version.entity';
import { CreateExecutionDto } from './execution.dto';
import {
  ExecutionCheckpointResponse,
  ExecutionDetailResponse,
  ExecutionSummaryResponse,
} from './execution.types';
import { ExecutionOrchestrator } from './orchestrator/execution.orchestrator';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);

  constructor(
    private readonly executionRepository: ExecutionRepository,
    private readonly checkpointRepository: ExecutionCheckpointRepository,
    private readonly runtimeRepository: RuntimeRepository,
    private readonly versionRepository: RuntimeVersionRepository,
    private readonly orchestrator: ExecutionOrchestrator,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateExecutionDto): Promise<ExecutionDetailResponse> {
    const document = dto.document.trim();
    if (!document) {
      throw new BadRequestException('Document must not be empty');
    }

    const runtime = await this.runtimeRepository.findById(dto.runtimeId);
    if (!runtime) {
      throw new NotFoundException('Runtime not found');
    }

    if (!runtime.activeVersionId) {
      throw new BadRequestException(
        'No published runtime version available for production execution',
      );
    }

    const version = await this.versionRepository.findById(
      runtime.activeVersionId,
    );
    if (!version) {
      throw new NotFoundException('Published runtime version not found');
    }

    if (version.status !== RuntimeVersionStatus.Published) {
      throw new BadRequestException(
        'Draft runtime versions cannot be executed in production',
      );
    }

    if (version.runtimeId !== runtime.id) {
      throw new BadRequestException(
        'Active version does not belong to this runtime',
      );
    }

    const execution = await this.executionRepository.create({
      runtimeId: runtime.id,
      runtimeVersionId: version.id,
      status: ExecutionStatus.Queued,
      currentStep: ExecutionStep.Queued,
      document,
    });

    await this.auditService.record({
      runtimeId: runtime.id,
      eventType: AuditEventType.ExecutionStarted,
      entityType: AuditEntityType.Execution,
      entityId: execution.id,
      title: 'Execution Started',
      description: `Version ${version.version}`,
      metadata: {
        runtimeVersionId: version.id,
        runtimeVersionNumber: version.version,
        document,
      },
    });

    this.logger.log(
      JSON.stringify({
        executionId: execution.id,
        runtimeVersionId: version.id,
        currentStep: execution.currentStep,
        retryCount: execution.retryCount,
        success: true,
        message: 'Execution queued',
      }),
    );

    this.scheduleRun(execution, version);
    return this.toDetailResponse(execution, version);
  }

  async list(runtimeId: string): Promise<ExecutionSummaryResponse[]> {
    const runtime = await this.runtimeRepository.findById(runtimeId);
    if (!runtime) {
      throw new NotFoundException('Runtime not found');
    }

    const executions =
      await this.executionRepository.findByRuntimeId(runtimeId);
    const versionCache = new Map<string, RuntimeVersionEntity | null>();

    const summaries: ExecutionSummaryResponse[] = [];
    for (const execution of executions) {
      let version = versionCache.get(execution.runtimeVersionId);
      if (version === undefined) {
        version =
          (await this.versionRepository.findById(execution.runtimeVersionId)) ??
          null;
        versionCache.set(execution.runtimeVersionId, version);
      }
      summaries.push(this.toSummaryResponse(execution, version));
    }

    return summaries;
  }

  async getById(id: string): Promise<ExecutionDetailResponse> {
    const execution = await this.getExecutionOrThrow(id);
    const version = await this.versionRepository.findById(
      execution.runtimeVersionId,
    );
    return this.toDetailResponse(execution, version);
  }

  async resume(id: string): Promise<ExecutionDetailResponse> {
    const execution = await this.getExecutionOrThrow(id);

    if (execution.status === ExecutionStatus.Completed) {
      throw new BadRequestException('Cannot resume a completed execution');
    }

    if (execution.status === ExecutionStatus.Running) {
      throw new BadRequestException('Cannot resume a running execution');
    }

    if (execution.status === ExecutionStatus.Cancelled) {
      throw new BadRequestException('Cannot resume a cancelled execution');
    }

    if (execution.status === ExecutionStatus.Failed) {
      throw new BadRequestException('Cannot resume a failed execution');
    }

    if (execution.status !== ExecutionStatus.Paused) {
      throw new BadRequestException('Only paused executions can be resumed');
    }

    const version = await this.versionRepository.findById(
      execution.runtimeVersionId,
    );
    if (!version) {
      throw new NotFoundException('Published runtime version not found');
    }

    const updated =
      (await this.executionRepository.update(execution.id, {
        status: ExecutionStatus.Running,
        retryCount: execution.retryCount + 1,
      })) ?? execution;

    await this.auditService.record({
      runtimeId: updated.runtimeId,
      eventType: AuditEventType.ExecutionResumed,
      entityType: AuditEntityType.Execution,
      entityId: updated.id,
      title: 'Execution Resumed',
      description: `Retry ${updated.retryCount}`,
      metadata: {
        runtimeVersionId: updated.runtimeVersionId,
        runtimeVersionNumber: version.version,
        currentStep: updated.currentStep,
        retryCount: updated.retryCount,
      },
    });

    this.logger.log(
      JSON.stringify({
        executionId: updated.id,
        runtimeVersionId: updated.runtimeVersionId,
        currentStep: updated.currentStep,
        retryCount: updated.retryCount,
        success: true,
        message: 'Execution resumed',
      }),
    );

    this.scheduleRun(updated, version);
    return this.toDetailResponse(updated, version);
  }

  async cancel(id: string): Promise<ExecutionDetailResponse> {
    const execution = await this.getExecutionOrThrow(id);

    if (execution.status === ExecutionStatus.Completed) {
      throw new BadRequestException('Cannot cancel a completed execution');
    }

    if (execution.status === ExecutionStatus.Cancelled) {
      throw new BadRequestException('Execution is already cancelled');
    }

    if (execution.status === ExecutionStatus.Failed) {
      throw new BadRequestException('Cannot cancel a failed execution');
    }

    const updated =
      (await this.executionRepository.update(execution.id, {
        status: ExecutionStatus.Cancelled,
        completedAt: new Date(),
      })) ?? execution;

    this.logger.log(
      JSON.stringify({
        executionId: updated.id,
        runtimeVersionId: updated.runtimeVersionId,
        currentStep: updated.currentStep,
        retryCount: updated.retryCount,
        success: true,
        message: 'Execution cancelled',
      }),
    );

    const version = await this.versionRepository.findById(
      updated.runtimeVersionId,
    );
    return this.toDetailResponse(updated, version);
  }

  // ponytail: in-process fire-and-forget; ceiling = single Node process, no durable worker queue. Upgrade: BullMQ / separate worker when multi-instance.
  private scheduleRun(
    execution: ExecutionEntity,
    version: RuntimeVersionEntity,
  ): void {
    void this.orchestrator
      .run(execution, version.instructions)
      .then((completed) => this.recordTerminalAudit(completed, version))
      .catch(async (error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown orchestrator failure';
        this.logger.error(
          JSON.stringify({
            executionId: execution.id,
            runtimeVersionId: execution.runtimeVersionId,
            currentStep: execution.currentStep,
            retryCount: execution.retryCount,
            success: false,
            message,
          }),
        );

        const paused =
          (await this.executionRepository.update(execution.id, {
            status: ExecutionStatus.Paused,
          })) ?? execution;
        await this.recordTerminalAudit(paused, version);
      });
  }

  private async recordTerminalAudit(
    execution: ExecutionEntity,
    version: RuntimeVersionEntity,
  ): Promise<void> {
    if (execution.status === ExecutionStatus.Completed) {
      const checkpoints = await this.checkpointRepository.findByExecutionId(
        execution.id,
      );
      const answerCheckpoint = checkpoints.find(
        (item) => item.step === ExecutionStep.GenerateAnswers,
      );
      const extractCheckpoint = checkpoints.find(
        (item) => item.step === ExecutionStep.ExtractStructuredData,
      );
      const traceId =
        (typeof answerCheckpoint?.output.traceId === 'string'
          ? answerCheckpoint.output.traceId
          : null) ??
        (typeof extractCheckpoint?.output.traceId === 'string'
          ? extractCheckpoint.output.traceId
          : null);

      await this.auditService.record({
        runtimeId: execution.runtimeId,
        eventType: AuditEventType.ExecutionCompleted,
        entityType: AuditEntityType.Execution,
        entityId: execution.id,
        title: 'Execution',
        description: `Version ${version.version}`,
        traceId,
        metadata: {
          runtimeVersionId: version.id,
          runtimeVersionNumber: version.version,
          status: execution.status,
          retryCount: execution.retryCount,
          startedAt: execution.startedAt.toISOString(),
          completedAt: execution.completedAt?.toISOString() ?? null,
          durationMs:
            execution.completedAt && execution.startedAt
              ? execution.completedAt.getTime() - execution.startedAt.getTime()
              : null,
          document: execution.document,
          finalOutput: execution.finalOutput,
          structuredOutput: extractCheckpoint?.output.structuredData ?? null,
          prompt:
            typeof answerCheckpoint?.output.prompt === 'string'
              ? answerCheckpoint.output.prompt
              : null,
          response:
            typeof answerCheckpoint?.output.response === 'string'
              ? answerCheckpoint.output.response
              : null,
          latencyMs: answerCheckpoint?.output.latencyMs ?? null,
          model: answerCheckpoint?.output.model ?? null,
          provider: answerCheckpoint?.output.provider ?? null,
          inputTokens: answerCheckpoint?.output.inputTokens ?? null,
          outputTokens: answerCheckpoint?.output.outputTokens ?? null,
          totalTokens: answerCheckpoint?.output.totalTokens ?? null,
          cost: null,
        },
      });
      return;
    }

    if (execution.status === ExecutionStatus.Paused) {
      await this.auditService.record({
        runtimeId: execution.runtimeId,
        eventType: AuditEventType.ExecutionPaused,
        entityType: AuditEntityType.Execution,
        entityId: execution.id,
        title: 'Execution Paused',
        description: `At step ${execution.currentStep}`,
        metadata: {
          runtimeVersionId: version.id,
          runtimeVersionNumber: version.version,
          currentStep: execution.currentStep,
          retryCount: execution.retryCount,
        },
      });
      return;
    }

    if (execution.status === ExecutionStatus.Failed) {
      await this.auditService.record({
        runtimeId: execution.runtimeId,
        eventType: AuditEventType.ExecutionFailed,
        entityType: AuditEntityType.Execution,
        entityId: execution.id,
        title: 'Execution Failed',
        description: `At step ${execution.currentStep}`,
        metadata: {
          runtimeVersionId: version.id,
          runtimeVersionNumber: version.version,
          currentStep: execution.currentStep,
          retryCount: execution.retryCount,
        },
      });
    }
  }

  private async getExecutionOrThrow(id: string): Promise<ExecutionEntity> {
    const execution = await this.executionRepository.findById(id);
    if (!execution) {
      throw new NotFoundException('Execution not found');
    }
    return execution;
  }

  private async toDetailResponse(
    execution: ExecutionEntity,
    version: RuntimeVersionEntity | null | undefined,
  ): Promise<ExecutionDetailResponse> {
    const checkpoints = await this.checkpointRepository.findByExecutionId(
      execution.id,
    );

    return {
      ...this.toSummaryResponse(execution, version ?? null),
      document: execution.document,
      finalOutput: execution.finalOutput,
      checkpoints: checkpoints.map((checkpoint) =>
        this.toCheckpointResponse(checkpoint),
      ),
    };
  }

  private toSummaryResponse(
    execution: ExecutionEntity,
    version: RuntimeVersionEntity | null,
  ): ExecutionSummaryResponse {
    return {
      id: execution.id,
      runtimeId: execution.runtimeId,
      runtimeVersionId: execution.runtimeVersionId,
      runtimeVersionNumber: version?.version ?? null,
      runtimeVersionStatus: version?.status ?? null,
      status: execution.status,
      currentStep: execution.currentStep,
      retryCount: execution.retryCount,
      startedAt: execution.startedAt.toISOString(),
      completedAt: execution.completedAt
        ? execution.completedAt.toISOString()
        : null,
    };
  }

  private toCheckpointResponse(
    checkpoint: ExecutionCheckpointEntity,
  ): ExecutionCheckpointResponse {
    return {
      id: checkpoint.id,
      step: checkpoint.step,
      output: checkpoint.output,
      completedAt: checkpoint.completedAt.toISOString(),
    };
  }
}
