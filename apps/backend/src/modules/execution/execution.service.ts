import {
  BadRequestException,
  HttpException,
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
import { DocumentParserService } from '../document-parser/document-parser.service';
import { TempFileService } from '../document-parser/temp-file.service';
import {
  ExecutionCheckpointResponse,
  ExecutionDetailResponse,
  ExecutionSummaryResponse,
} from './execution.types';
import { ExecutionOrchestrator } from './orchestrator/execution.orchestrator';

const MAX_EXTRACTED_CHARS = 100_000;

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
    private readonly documentParser: DocumentParserService,
    private readonly tempFileService: TempFileService,
  ) {}

  async createFromUpload(input: {
    runtimeId: string;
    versionId?: string;
    tempFilePath: string;
    mimetype: string;
  }): Promise<ExecutionDetailResponse> {
    const version = await this.resolvePublishedVersion(
      input.runtimeId,
      input.versionId,
    );

    const execution = await this.executionRepository.create({
      runtimeId: input.runtimeId,
      runtimeVersionId: version.id,
      status: ExecutionStatus.Queued,
      currentStep: ExecutionStep.ParsingDocument,
      document: '',
      tempFilePath: input.tempFilePath,
      parserError: null,
    });

    await this.auditService.record({
      runtimeId: input.runtimeId,
      eventType: AuditEventType.ExecutionStarted,
      entityType: AuditEntityType.Execution,
      entityId: execution.id,
      title: 'Execution Started',
      description: `Version ${version.version} — parsing PDF`,
      metadata: {
        runtimeVersionId: version.id,
        runtimeVersionNumber: version.version,
        source: 'pdf',
        mimetype: input.mimetype,
      },
    });

    this.logger.log(
      JSON.stringify({
        executionId: execution.id,
        runtimeVersionId: version.id,
        currentStep: execution.currentStep,
        retryCount: execution.retryCount,
        success: true,
        message: 'Execution queued for PDF parsing',
      }),
    );

    this.scheduleParseAndRun(execution, version, input.mimetype);
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
        parserError: null,
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

    if (updated.currentStep === ExecutionStep.ParsingDocument) {
      this.scheduleParseAndRun(updated, version, 'application/pdf');
    } else {
      this.scheduleRun(updated, version);
    }

    return this.toDetailResponse(updated, version);
  }

  // ponytail: in-process fire-and-forget; ceiling = single Node process, no durable worker queue. Upgrade: BullMQ / separate worker when multi-instance.
  private scheduleParseAndRun(
    execution: ExecutionEntity,
    version: RuntimeVersionEntity,
    mimetype: string,
  ): void {
    void this.parseThenRun(execution, version, mimetype).catch(
      async (error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'Unknown parse pipeline failure';
        this.logger.error(
          JSON.stringify({
            executionId: execution.id,
            runtimeVersionId: execution.runtimeVersionId,
            currentStep: ExecutionStep.ParsingDocument,
            retryCount: execution.retryCount,
            success: false,
            message,
          }),
        );

        const paused =
          (await this.executionRepository.update(execution.id, {
            status: ExecutionStatus.Paused,
            currentStep: ExecutionStep.ParsingDocument,
            parserError: message,
          })) ?? execution;
        await this.recordTerminalAudit(paused, version);
      },
    );
  }

  private async parseThenRun(
    execution: ExecutionEntity,
    version: RuntimeVersionEntity,
    mimetype: string,
  ): Promise<void> {
    const parsed = await this.runParsing(execution, mimetype);
    await this.recordTerminalAudit(parsed, version);

    if (parsed.status !== ExecutionStatus.Running) {
      return;
    }

    const completed = await this.orchestrator.run(parsed, version.instructions);
    await this.recordTerminalAudit(completed, version);
  }

  private async runParsing(
    execution: ExecutionEntity,
    mimetype: string,
  ): Promise<ExecutionEntity> {
    let current =
      (await this.executionRepository.update(execution.id, {
        status: ExecutionStatus.Running,
        currentStep: ExecutionStep.ParsingDocument,
        parserError: null,
      })) ?? execution;

    const existingCheckpoints =
      await this.checkpointRepository.findByExecutionId(current.id);
    const alreadyParsed = existingCheckpoints.some(
      (checkpoint) => checkpoint.step === ExecutionStep.ParsingDocument,
    );

    if (alreadyParsed && current.document.trim()) {
      await this.tempFileService.delete(current.tempFilePath);
      return (
        (await this.executionRepository.update(current.id, {
          status: ExecutionStatus.Running,
          currentStep: ExecutionStep.Queued,
          tempFilePath: null,
          parserError: null,
        })) ?? current
      );
    }

    if (!current.tempFilePath) {
      const message =
        'Temporary PDF is missing — upload expired. Start a new execution.';
      return (
        (await this.executionRepository.update(current.id, {
          status: ExecutionStatus.Failed,
          currentStep: ExecutionStep.ParsingDocument,
          parserError: message,
          completedAt: new Date(),
        })) ?? current
      );
    }

    try {
      const result = await this.documentParser.parseFile({
        filePath: current.tempFilePath,
        mimetype,
      });

      if (!result.text.trim()) {
        throw new BadRequestException(
          'No readable text could be extracted from this PDF',
        );
      }

      if (result.text.length > MAX_EXTRACTED_CHARS) {
        throw new BadRequestException(
          `Extracted text exceeds ${MAX_EXTRACTED_CHARS.toLocaleString()} characters`,
        );
      }

      current =
        (await this.executionRepository.update(current.id, {
          document: result.text,
          parserError: null,
        })) ?? current;

      await this.checkpointRepository.create({
        executionId: current.id,
        step: ExecutionStep.ParsingDocument,
        output: {
          method: result.method,
          characterCount: result.text.length,
          preview: result.text.slice(0, 240),
        },
      });

      await this.tempFileService.delete(current.tempFilePath);

      return (
        (await this.executionRepository.update(current.id, {
          status: ExecutionStatus.Running,
          currentStep: ExecutionStep.Queued,
          tempFilePath: null,
          parserError: null,
        })) ?? current
      );
    } catch (error) {
      const message = this.toUserFacingError(error);
      return (
        (await this.executionRepository.update(current.id, {
          status: ExecutionStatus.Paused,
          currentStep: ExecutionStep.ParsingDocument,
          parserError: message,
        })) ?? current
      );
    }
  }

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

        await this.auditService.record({
          runtimeId: paused.runtimeId,
          eventType: AuditEventType.ExecutionPaused,
          entityType: AuditEntityType.Execution,
          entityId: paused.id,
          title: 'Execution Paused',
          description: message,
          metadata: {
            runtimeVersionId: version.id,
            runtimeVersionNumber: version.version,
            currentStep: paused.currentStep,
            retryCount: paused.retryCount,
            failure: message,
          },
        });
      });
  }

  private async resolvePublishedVersion(
    runtimeId: string,
    versionId?: string,
  ): Promise<RuntimeVersionEntity> {
    const runtime = await this.runtimeRepository.findById(runtimeId);
    if (!runtime) {
      throw new NotFoundException('Runtime not found');
    }

    if (!runtime.activeVersionId) {
      throw new BadRequestException(
        'No published runtime version available for production execution',
      );
    }

    if (versionId && versionId !== runtime.activeVersionId) {
      throw new BadRequestException(
        'versionId must match the active Published runtime version',
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

    return version;
  }

  private toUserFacingError(error: unknown): string {
    if (error instanceof HttpException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (
        response &&
        typeof response === 'object' &&
        'message' in response
      ) {
        const message = (response as { message: unknown }).message;
        if (typeof message === 'string') {
          return message;
        }
        if (Array.isArray(message) && message.length > 0) {
          return String(message[0]);
        }
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Document parsing failed';
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
      // AI step pauses are audited by the orchestrator (with Langfuse traceId).
      // Parse-stage pauses still need an audit here.
      if (execution.currentStep !== ExecutionStep.ParsingDocument) {
        return;
      }

      await this.auditService.record({
        runtimeId: execution.runtimeId,
        eventType: AuditEventType.ExecutionPaused,
        entityType: AuditEntityType.Execution,
        entityId: execution.id,
        title: 'Execution Paused',
        description: execution.parserError
          ? execution.parserError
          : `At step ${execution.currentStep}`,
        metadata: {
          runtimeVersionId: version.id,
          runtimeVersionNumber: version.version,
          currentStep: execution.currentStep,
          retryCount: execution.retryCount,
          parserError: execution.parserError,
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
        description: execution.parserError
          ? execution.parserError
          : `At step ${execution.currentStep}`,
        metadata: {
          runtimeVersionId: version.id,
          runtimeVersionNumber: version.version,
          currentStep: execution.currentStep,
          retryCount: execution.retryCount,
          parserError: execution.parserError,
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
      parserError: execution.parserError,
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
