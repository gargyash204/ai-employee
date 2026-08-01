import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { LangfuseService } from '../langfuse/langfuse.service';
import {
  AuditEntityType,
  AuditEventEntity,
  AuditEventType,
} from '../../repositories/audit-event/audit-event.entity';
import { EvaluationDatasetRepository } from '../../repositories/evaluation-dataset/evaluation-dataset.repository';
import { EvaluationCaseRepository } from '../../repositories/evaluation-case/evaluation-case.repository';
import { EvaluationResultRepository } from '../../repositories/evaluation-result/evaluation-result.repository';
import { EvaluationRunRepository } from '../../repositories/evaluation-run/evaluation-run.repository';
import { EvaluationRunStatus } from '../../repositories/evaluation-run/evaluation-run.entity';
import { ExecutionCheckpointRepository } from '../../repositories/execution-checkpoint/execution-checkpoint.repository';
import {
  ExecutionStatus,
  ExecutionStep,
} from '../../repositories/execution/execution.entity';
import { ExecutionRepository } from '../../repositories/execution/execution.repository';
import { ExperimentSessionRepository } from '../../repositories/experiment-session/experiment-session.repository';
import { RuntimeRepository } from '../../repositories/runtime/runtime.repository';
import { RuntimeVersionRepository } from '../../repositories/runtime-version/runtime-version.repository';
import { RuntimeVersionStatus } from '../../repositories/runtime-version/runtime-version.entity';
import {
  ActivityDetailsDto,
  ActivityFeedItemDto,
  ObservabilityOverviewDto,
  ObservabilitySummaryDto,
  RuntimeSummaryDto,
} from './observability.types';

const DETAIL_EVENT_TYPES = new Set<AuditEventType>([
  AuditEventType.ExperimentCompleted,
  AuditEventType.QuestionAsked,
  AuditEventType.EvaluationCompleted,
  AuditEventType.ExecutionCompleted,
  AuditEventType.ExecutionPaused,
  AuditEventType.ExecutionFailed,
  AuditEventType.ExecutionStarted,
  AuditEventType.ExecutionResumed,
]);

@Injectable()
export class ObservabilityService {
  constructor(
    private readonly auditService: AuditService,
    private readonly langfuseService: LangfuseService,
    private readonly runtimeRepository: RuntimeRepository,
    private readonly versionRepository: RuntimeVersionRepository,
    private readonly executionRepository: ExecutionRepository,
    private readonly checkpointRepository: ExecutionCheckpointRepository,
    private readonly experimentSessionRepository: ExperimentSessionRepository,
    private readonly datasetRepository: EvaluationDatasetRepository,
    private readonly caseRepository: EvaluationCaseRepository,
    private readonly runRepository: EvaluationRunRepository,
    private readonly resultRepository: EvaluationResultRepository,
  ) {}

  async getOverview(
    runtimeId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<ObservabilityOverviewDto> {
    const summary = await this.buildRuntimeSummary(runtimeId);
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const [events, total, statistics] = await Promise.all([
      this.auditService.findByRuntimeId(runtimeId, { limit, offset }),
      this.auditService.countByRuntimeId(runtimeId),
      this.getSummary(runtimeId),
    ]);

    return {
      summary,
      activity: events.map((event) => this.toActivityItem(event)),
      activityTotal: total,
      statistics,
    };
  }

  async getSummary(runtimeId: string): Promise<ObservabilitySummaryDto> {
    await this.ensureRuntime(runtimeId);

    const [
      executions,
      completedExecutions,
      experiments,
      publishedVersions,
      datasets,
      latestActivity,
    ] = await Promise.all([
      this.executionRepository.countByRuntimeId(runtimeId),
      this.executionRepository.countByRuntimeIdAndStatus(
        runtimeId,
        ExecutionStatus.Completed,
      ),
      this.experimentSessionRepository.countByRuntimeId(runtimeId),
      this.versionRepository.countByRuntimeIdAndStatus(
        runtimeId,
        RuntimeVersionStatus.Published,
      ),
      this.datasetRepository.findByRuntimeId(runtimeId),
      this.auditService.findLatestByRuntimeId(runtimeId),
    ]);

    const runs = await this.runRepository.findByDatasetIds(
      datasets.map((dataset) => dataset.id),
    );
    const completedRuns = runs.filter(
      (run) => run.status === EvaluationRunStatus.Completed,
    );

    const telemetrySamples = await this.collectTelemetrySamples(runtimeId);

    const averageLatencyMs = this.average(
      telemetrySamples
        .map((item) => item.latencyMs)
        .filter((value): value is number => value !== null),
    );
    const averageTokens = this.average(
      telemetrySamples
        .map((item) => item.totalTokens)
        .filter((value): value is number => value !== null),
    );
    const averageCost = this.average(
      telemetrySamples
        .map((item) => item.cost)
        .filter((value): value is number => value !== null),
    );

    const evaluationSuccessRate =
      completedRuns.length > 0
        ? this.average(completedRuns.map((run) => Number(run.score)))
        : null;

    return {
      executions,
      experiments,
      evaluations: runs.length,
      publishedVersions,
      averageLatencyMs,
      averageTokens,
      averageCost,
      executionSuccessRate:
        executions > 0
          ? Number(((completedExecutions / executions) * 100).toFixed(2))
          : null,
      evaluationSuccessRate,
      latestActivityAt: latestActivity?.createdAt.toISOString() ?? null,
    };
  }

  async getActivityDetails(activityId: string): Promise<ActivityDetailsDto> {
    const event = await this.auditService.findById(activityId);
    if (!event) {
      throw new NotFoundException('Audit Event not found');
    }

    const activity = this.toActivityItem(event);
    const telemetry = event.traceId
      ? await this.langfuseService.getTelemetry(event.traceId)
      : null;

    const details = await this.buildDetails(event);

    return {
      activity,
      telemetry,
      details,
    };
  }

  private async buildRuntimeSummary(
    runtimeId: string,
  ): Promise<RuntimeSummaryDto> {
    const runtime = await this.ensureRuntime(runtimeId);
    const [published, draft, executions, datasets] = await Promise.all([
      this.versionRepository.findByRuntimeIdAndStatus(
        runtimeId,
        RuntimeVersionStatus.Published,
      ),
      this.versionRepository.findByRuntimeIdAndStatus(
        runtimeId,
        RuntimeVersionStatus.Draft,
      ),
      this.executionRepository.countByRuntimeId(runtimeId),
      this.datasetRepository.findByRuntimeId(runtimeId),
    ]);

    const runs = await this.runRepository.findByDatasetIds(
      datasets.map((dataset) => dataset.id),
    );
    const latestCompleted = runs.find(
      (run) => run.status === EvaluationRunStatus.Completed,
    );

    let status: RuntimeSummaryDto['status'] = 'Unpublished';
    if (published) {
      status = 'Published';
    } else if (draft) {
      status = 'Draft';
    }

    return {
      runtimeId: runtime.id,
      name: runtime.name,
      status,
      publishedVersion: published?.version ?? null,
      draftVersion: draft?.version ?? null,
      executions,
      latestEvaluationScore: latestCompleted
        ? Number(latestCompleted.score)
        : null,
    };
  }

  private async buildDetails(
    event: AuditEventEntity,
  ): Promise<Record<string, unknown>> {
    const metadata = event.metadata ?? {};

    if (
      event.eventType === AuditEventType.ExperimentCompleted ||
      event.eventType === AuditEventType.QuestionAsked
    ) {
      return {
        kind: 'experiment',
        ...metadata,
        langfuseUrl: event.traceId
          ? this.langfuseService.getTraceUrl(event.traceId)
          : null,
      };
    }

    if (event.eventType === AuditEventType.EvaluationCompleted) {
      const run = await this.runRepository.findById(event.entityId);
      if (!run) {
        throw new NotFoundException('Evaluation not found');
      }

      const [results, dataset] = await Promise.all([
        this.resultRepository.findByRunId(run.id),
        this.datasetRepository.findById(run.datasetId),
      ]);
      const cases = dataset
        ? await this.caseRepository.findByDatasetId(dataset.id)
        : [];
      const caseById = new Map(cases.map((item) => [item.id, item]));

      return {
        kind: 'evaluation',
        datasetName: dataset?.name ?? metadata.datasetName ?? null,
        runtimeVersionNumber: metadata.runtimeVersionNumber ?? null,
        score: metadata.score ?? Number(run.score),
        passed: metadata.passed ?? run.passed,
        failed: metadata.failed ?? run.failed,
        durationMs: metadata.durationMs ?? null,
        averageLatencyMs: metadata.averageLatencyMs ?? null,
        results: results.map((result) => {
          const testCase = caseById.get(result.evaluationCaseId);
          return {
            id: result.id,
            evaluationCaseId: result.evaluationCaseId,
            question: testCase?.question ?? null,
            expectedAnswer: result.expectedAnswer,
            actualAnswer: result.actualAnswer,
            passed: result.passed,
            latency: result.latency,
            error: result.error,
            traceId: result.traceId,
            langfuseUrl: result.traceId
              ? this.langfuseService.getTraceUrl(result.traceId)
              : null,
          };
        }),
      };
    }

    if (
      event.eventType === AuditEventType.ExecutionCompleted ||
      event.eventType === AuditEventType.ExecutionPaused ||
      event.eventType === AuditEventType.ExecutionFailed ||
      event.eventType === AuditEventType.ExecutionStarted ||
      event.eventType === AuditEventType.ExecutionResumed
    ) {
      const execution = await this.executionRepository.findById(event.entityId);
      if (!execution) {
        throw new NotFoundException('Execution not found');
      }

      const checkpoints = await this.checkpointRepository.findByExecutionId(
        execution.id,
      );
      const version = await this.versionRepository.findById(
        execution.runtimeVersionId,
      );

      return {
        kind: 'execution',
        ...metadata,
        executionStatus: execution.status,
        runtimeVersionNumber: version?.version ?? null,
        currentStep: execution.currentStep,
        retryCount: execution.retryCount,
        document: execution.document,
        finalOutput: execution.finalOutput,
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt?.toISOString() ?? null,
        durationMs:
          execution.completedAt && execution.startedAt
            ? execution.completedAt.getTime() - execution.startedAt.getTime()
            : null,
        checkpoints: checkpoints.map((checkpoint) => ({
          id: checkpoint.id,
          step: checkpoint.step,
          output: checkpoint.output,
          completedAt: checkpoint.completedAt.toISOString(),
        })),
        stepOrder: [
          ExecutionStep.ParsingDocument,
          ExecutionStep.Queued,
          ExecutionStep.ReadingDocument,
          ExecutionStep.ExtractStructuredData,
          ExecutionStep.GenerateAnswers,
          ExecutionStep.ValidateResult,
          ExecutionStep.SaveOutput,
          ExecutionStep.Completed,
        ],
        langfuseUrl: event.traceId
          ? this.langfuseService.getTraceUrl(event.traceId)
          : null,
      };
    }

    if (event.entityType === AuditEntityType.ExperimentSession) {
      const session = await this.experimentSessionRepository.findById(
        event.entityId,
      );
      if (!session && event.eventType !== AuditEventType.ExperimentStarted) {
        throw new NotFoundException('Experiment not found');
      }
    }

    return {
      kind: 'generic',
      ...metadata,
      langfuseUrl: event.traceId
        ? this.langfuseService.getTraceUrl(event.traceId)
        : null,
    };
  }

  private async collectTelemetrySamples(runtimeId: string): Promise<
    Array<{
      latencyMs: number | null;
      totalTokens: number | null;
      cost: number | null;
    }>
  > {
    const events = await this.auditService.findByRuntimeId(runtimeId, {
      limit: 50,
      offset: 0,
    });

    const samples: Array<{
      latencyMs: number | null;
      totalTokens: number | null;
      cost: number | null;
    }> = [];

    for (const event of events) {
      const metadata = event.metadata ?? {};
      const latencyMs =
        typeof metadata.latencyMs === 'number' ? metadata.latencyMs : null;
      const totalTokens =
        typeof metadata.totalTokens === 'number' ? metadata.totalTokens : null;
      const cost = typeof metadata.cost === 'number' ? metadata.cost : null;

      if (latencyMs !== null || totalTokens !== null || cost !== null) {
        samples.push({ latencyMs, totalTokens, cost });
        continue;
      }

      if (!event.traceId) {
        continue;
      }

      const telemetry = await this.langfuseService.getTelemetry(event.traceId);
      if (telemetry.available) {
        samples.push({
          latencyMs: telemetry.latencyMs,
          totalTokens: telemetry.totalTokens,
          cost: telemetry.cost,
        });
      }
    }

    return samples;
  }

  private toActivityItem(event: AuditEventEntity): ActivityFeedItemDto {
    return {
      id: event.id,
      eventType: event.eventType,
      entityType: event.entityType,
      entityId: event.entityId,
      title: event.title,
      description: event.description,
      traceId: event.traceId,
      langfuseUrl: event.traceId
        ? this.langfuseService.getTraceUrl(event.traceId)
        : null,
      createdAt: event.createdAt.toISOString(),
      hasDetails: DETAIL_EVENT_TYPES.has(event.eventType),
      metadata: event.metadata,
    };
  }

  private async ensureRuntime(runtimeId: string) {
    const runtime = await this.runtimeRepository.findById(runtimeId);
    if (!runtime) {
      throw new NotFoundException('Runtime not found');
    }
    return runtime;
  }

  private average(values: number[]): number | null {
    if (values.length === 0) {
      return null;
    }
    const sum = values.reduce((acc, value) => acc + value, 0);
    return Number((sum / values.length).toFixed(2));
  }
}
