import {
  BadRequestException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AI_PROVIDER,
  type AiProvider,
} from '../ai-provider/ai-provider.interface';
import { AiProviderError } from '../ai-provider/ai-provider.error';
import { AuditService } from '../audit/audit.service';
import { LangfuseService } from '../langfuse/langfuse.service';
import {
  AuditEntityType,
  AuditEventType,
} from '../../repositories/audit-event/audit-event.entity';
import { ExperimentSessionRepository } from '../../repositories/experiment-session/experiment-session.repository';
import { ExperimentSessionEntity } from '../../repositories/experiment-session/experiment-session.entity';
import { RuntimeVersionRepository } from '../../repositories/runtime-version/runtime-version.repository';
import { RuntimeVersionEntity } from '../../repositories/runtime-version/runtime-version.entity';
import { EvaluationService } from '../evaluation/evaluation.service';
import { RunExperimentDto } from './experiment.dto';
import {
  buildExtractionMessages,
  parseExtractionResponse,
  type ExtractionResult,
} from './experiment.prompts';
import {
  ExperimentSessionResponse,
  RunExperimentResponse,
} from './experiment.types';

@Injectable()
export class ExperimentService {
  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly langfuseService: LangfuseService,
    private readonly auditService: AuditService,
    private readonly sessionRepository: ExperimentSessionRepository,
    private readonly evaluationService: EvaluationService,
    private readonly versionRepository: RuntimeVersionRepository,
  ) {}

  async run(dto: RunExperimentDto): Promise<RunExperimentResponse> {
    const document = dto.document.trim();
    if (!document) {
      throw new BadRequestException('Document must not be empty');
    }

    if (dto.versionBId && dto.versionBId === dto.versionAId) {
      throw new BadRequestException(
        'Version A and Version B must be different',
      );
    }

    const versionA = await this.getVersionOrThrow(dto.versionAId);
    let versionB: RuntimeVersionEntity | null = null;

    if (dto.versionBId) {
      versionB = await this.getVersionOrThrow(dto.versionBId);
      if (versionB.runtimeId !== versionA.runtimeId) {
        throw new BadRequestException(
          'Version A and Version B must belong to the same runtime',
        );
      }
    }

    await this.auditService.record({
      runtimeId: versionA.runtimeId,
      eventType: AuditEventType.ExperimentStarted,
      entityType: AuditEntityType.ExperimentSession,
      entityId: versionA.id,
      title: 'Experiment Started',
      description: versionB
        ? `Comparing versions ${versionA.version} and ${versionB.version}`
        : `Running version ${versionA.version}`,
      metadata: {
        versionAId: versionA.id,
        versionBId: versionB?.id ?? null,
      },
    });

    const extractionA = await this.runExtraction(versionA, document);
    const extractionB = versionB
      ? await this.runExtraction(versionB, document)
      : null;

    const session = await this.sessionRepository.create({
      runtimeId: versionA.runtimeId,
      versionAId: versionA.id,
      versionBId: versionB?.id ?? null,
      document,
      extractionA: extractionA.result.structuredData,
      extractionB: extractionB?.result.structuredData ?? null,
      summaryA: extractionA.result.summary,
      summaryB: extractionB?.result.summary ?? null,
    });

    await this.auditService.record({
      runtimeId: versionA.runtimeId,
      eventType: AuditEventType.ExperimentCompleted,
      entityType: AuditEntityType.ExperimentSession,
      entityId: session.id,
      title: 'Experiment Run',
      description: versionB
        ? `Draft v${versionA.version} vs v${versionB.version}`
        : `Draft v${versionA.version}`,
      traceId: extractionA.traceId,
      metadata: {
        versionAId: versionA.id,
        versionANumber: versionA.version,
        versionBId: versionB?.id ?? null,
        versionBNumber: versionB?.version ?? null,
        document,
        instructionsA: versionA.instructions,
        instructionsB: versionB?.instructions ?? null,
        structuredOutputA: extractionA.result.structuredData,
        structuredOutputB: extractionB?.result.structuredData ?? null,
        summaryA: extractionA.result.summary,
        summaryB: extractionB?.result.summary ?? null,
        latencyMs: extractionA.latencyMs,
        model: extractionA.model,
        provider: extractionA.provider,
        inputTokens: extractionA.inputTokens,
        outputTokens: extractionA.outputTokens,
        totalTokens: extractionA.totalTokens,
        cost: null,
        traceIdA: extractionA.traceId,
        traceIdB: extractionB?.traceId ?? null,
      },
    });

    let evaluationRunId: string | null = null;
    let evaluationStatus: string | null = null;

    if (dto.runEvaluation) {
      if (!dto.datasetId) {
        throw new BadRequestException(
          'datasetId is required when runEvaluation is true',
        );
      }

      const background = await this.evaluationService.startBackgroundRun({
        datasetId: dto.datasetId,
        runtimeVersionId: versionA.id,
        document,
      });

      evaluationRunId = background.evaluationRunId;
      evaluationStatus = background.status;

      await this.sessionRepository.setEvaluationRunId(
        session.id,
        evaluationRunId,
      );
    }

    return {
      sessionId: session.id,
      versionA: {
        summary: extractionA.result.summary,
        structuredData: extractionA.result.structuredData,
      },
      versionB: extractionB
        ? {
            summary: extractionB.result.summary,
            structuredData: extractionB.result.structuredData,
          }
        : null,
      evaluationRunId,
      evaluationStatus,
    };
  }

  async getSession(sessionId: string): Promise<ExperimentSessionResponse> {
    const session = await this.getSessionOrThrow(sessionId);
    return this.toSessionResponse(session);
  }

  private async runExtraction(
    version: RuntimeVersionEntity,
    document: string,
  ): Promise<{
    result: ExtractionResult;
    traceId: string | null;
    latencyMs: number;
    model: string;
    provider: string;
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  }> {
    const messages = buildExtractionMessages({
      instructions: version.instructions,
      document,
    });

    try {
      const instrumented = await this.langfuseService.instrumentComplete(
        this.aiProvider,
        {
          name: 'experiment.extract',
          messages,
          instructions: version.instructions,
          document,
          metadata: {
            runtimeId: version.runtimeId,
            runtimeVersionId: version.id,
            operation: 'extract',
          },
        },
      );

      return {
        result: parseExtractionResponse(instrumented.completion.content),
        traceId: instrumented.traceId,
        latencyMs: instrumented.latencyMs,
        model: instrumented.completion.model,
        provider: instrumented.completion.provider,
        inputTokens: instrumented.completion.usage.inputTokens,
        outputTokens: instrumented.completion.usage.outputTokens,
        totalTokens: instrumented.completion.usage.totalTokens,
      };
    } catch (error) {
      this.rethrowAiError(error);
    }
  }

  private async getVersionOrThrow(
    versionId: string,
  ): Promise<RuntimeVersionEntity> {
    const version = await this.versionRepository.findById(versionId);
    if (!version) {
      throw new NotFoundException('Runtime version not found');
    }
    return version;
  }

  private async getSessionOrThrow(
    sessionId: string,
  ): Promise<ExperimentSessionEntity> {
    const session = await this.sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundException('Experiment session not found');
    }
    return session;
  }

  private toSessionResponse(
    session: ExperimentSessionEntity,
  ): ExperimentSessionResponse {
    return {
      id: session.id,
      runtimeId: session.runtimeId,
      versionAId: session.versionAId,
      versionBId: session.versionBId,
      document: session.document,
      extractionA: session.extractionA,
      extractionB: session.extractionB,
      summaryA: session.summaryA,
      summaryB: session.summaryB,
      evaluationRunId: session.evaluationRunId,
      createdAt: session.createdAt.toISOString(),
    };
  }

  private rethrowAiError(error: unknown): never {
    if (error instanceof AiProviderError) {
      if (error.code === 'TIMEOUT') {
        throw new GatewayTimeoutException('AI provider request timed out');
      }

      if (error.code === 'RATE_LIMIT') {
        throw new HttpException(
          'AI provider rate limit exceeded',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new HttpException(
        'AI provider request failed',
        HttpStatus.BAD_GATEWAY,
      );
    }

    throw error;
  }
}
