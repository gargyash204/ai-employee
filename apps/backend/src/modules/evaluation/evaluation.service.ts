import {
  BadRequestException,
  ConflictException,
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
import { EvaluationCaseRepository } from '../../repositories/evaluation-case/evaluation-case.repository';
import { EvaluationCaseEntity } from '../../repositories/evaluation-case/evaluation-case.entity';
import { EvaluationDatasetRepository } from '../../repositories/evaluation-dataset/evaluation-dataset.repository';
import { EvaluationDatasetEntity } from '../../repositories/evaluation-dataset/evaluation-dataset.entity';
import { EvaluationResultRepository } from '../../repositories/evaluation-result/evaluation-result.repository';
import { EvaluationRunRepository } from '../../repositories/evaluation-run/evaluation-run.repository';
import {
  EvaluationRunEntity,
  EvaluationRunStatus,
} from '../../repositories/evaluation-run/evaluation-run.entity';
import { RuntimeRepository } from '../../repositories/runtime/runtime.repository';
import { RuntimeVersionRepository } from '../../repositories/runtime-version/runtime-version.repository';
import { RuntimeVersionEntity } from '../../repositories/runtime-version/runtime-version.entity';
import {
  buildExtractionMessages,
  buildQuestionMessages,
  parseExtractionResponse,
} from '../experiment/experiment.prompts';
import { SemanticMatchComparator } from './answer-comparator';
import {
  CompareVersionsDto,
  CreateCaseDto,
  CreateDatasetDto,
  RunEvaluationDto,
  UpdateCaseDto,
} from './evaluation.dto';
import {
  CompareVersionsResponse,
  DatasetDetailResponse,
  EvaluationCaseResponse,
  EvaluationDatasetResponse,
  EvaluationRunDetailResponse,
  EvaluationRunSummaryResponse,
  EvaluationResultResponse,
  RunEvaluationResponse,
} from './evaluation.types';

@Injectable()
export class EvaluationService {
  private readonly answerComparator: SemanticMatchComparator;

  constructor(
    @Inject(AI_PROVIDER) private readonly aiProvider: AiProvider,
    private readonly langfuseService: LangfuseService,
    private readonly auditService: AuditService,
    private readonly datasetRepository: EvaluationDatasetRepository,
    private readonly caseRepository: EvaluationCaseRepository,
    private readonly runRepository: EvaluationRunRepository,
    private readonly resultRepository: EvaluationResultRepository,
    private readonly runtimeRepository: RuntimeRepository,
    private readonly versionRepository: RuntimeVersionRepository,
  ) {
    this.answerComparator = new SemanticMatchComparator(this.aiProvider);
  }

  async createDataset(
    dto: CreateDatasetDto,
  ): Promise<EvaluationDatasetResponse> {
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('Dataset name must not be empty');
    }

    const runtime = await this.runtimeRepository.findById(dto.runtimeId);
    if (!runtime) {
      throw new NotFoundException('Runtime not found');
    }

    const existing = await this.datasetRepository.findByRuntimeIdAndName(
      dto.runtimeId,
      name,
    );
    if (existing) {
      throw new ConflictException('A dataset with this name already exists');
    }

    const created = await this.datasetRepository.create({
      runtimeId: dto.runtimeId,
      name,
      description: dto.description?.trim() || null,
    });

    return this.toDatasetResponse(created);
  }

  async getDataset(datasetId: string): Promise<DatasetDetailResponse> {
    const dataset = await this.getDatasetOrThrow(datasetId);
    const cases = await this.caseRepository.findByDatasetId(datasetId);

    return {
      dataset: this.toDatasetResponse(dataset),
      cases: cases.map((item) => this.toCaseResponse(item)),
    };
  }

  async listDatasetsForRuntime(
    runtimeId: string,
  ): Promise<EvaluationDatasetResponse[]> {
    const runtime = await this.runtimeRepository.findById(runtimeId);
    if (!runtime) {
      throw new NotFoundException('Runtime not found');
    }

    const datasets = await this.datasetRepository.findByRuntimeId(runtimeId);
    return datasets.map((item) => this.toDatasetResponse(item));
  }

  async createCase(dto: CreateCaseDto): Promise<EvaluationCaseResponse> {
    await this.getDatasetOrThrow(dto.datasetId);
    const created = await this.caseRepository.create({
      datasetId: dto.datasetId,
      name: dto.name.trim(),
      question: dto.question.trim(),
      expectedAnswer: dto.expectedAnswer.trim(),
      tags: this.normalizeTags(dto.tags),
      sourceSessionId: null,
    });
    return this.toCaseResponse(created);
  }

  async updateCase(
    id: string,
    dto: UpdateCaseDto,
  ): Promise<EvaluationCaseResponse> {
    const existing = await this.caseRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Evaluation test case not found');
    }

    const updated = await this.caseRepository.update(id, {
      name: dto.name?.trim(),
      question: dto.question?.trim(),
      expectedAnswer: dto.expectedAnswer?.trim(),
      tags: dto.tags !== undefined ? this.normalizeTags(dto.tags) : undefined,
    });

    if (!updated) {
      throw new NotFoundException('Evaluation test case not found');
    }

    return this.toCaseResponse(updated);
  }

  async deleteCase(id: string): Promise<void> {
    const deleted = await this.caseRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Evaluation test case not found');
    }
  }

  async run(dto: RunEvaluationDto): Promise<RunEvaluationResponse> {
    const started = await this.createRunningEvaluation(dto);
    return this.executeRun(started.run.id, started.dataset, started.version);
  }

  /**
   * Creates an evaluation run and executes it without blocking the caller.
   * Callers poll GET /evaluations/run/:id for completion.
   */
  async startBackgroundRun(dto: RunEvaluationDto): Promise<{
    evaluationRunId: string;
    status: EvaluationRunStatus;
  }> {
    const started = await this.createRunningEvaluation(dto);

    // ponytail: in-process fire-and-forget; upgrade to a queue when evals outgrow one node
    void this.executeRun(started.run.id, started.dataset, started.version).catch(
      () => undefined,
    );

    return {
      evaluationRunId: started.run.id,
      status: EvaluationRunStatus.Running,
    };
  }

  private async createRunningEvaluation(dto: RunEvaluationDto): Promise<{
    run: EvaluationRunEntity;
    dataset: EvaluationDatasetEntity;
    version: RuntimeVersionEntity;
  }> {
    const document = dto.document.trim();
    if (!document) {
      throw new BadRequestException('Document must not be empty');
    }

    const dataset = await this.getDatasetOrThrow(dto.datasetId);
    const version = await this.getVersionOrThrow(dto.runtimeVersionId);

    if (version.runtimeId !== dataset.runtimeId) {
      throw new BadRequestException(
        'Runtime version must belong to the same runtime as the dataset',
      );
    }

    const cases = await this.caseRepository.findByDatasetId(dataset.id);
    if (cases.length === 0) {
      throw new BadRequestException('Dataset has no test cases');
    }

    const run = await this.runRepository.create({
      datasetId: dataset.id,
      runtimeVersionId: version.id,
      status: EvaluationRunStatus.Running,
      totalTests: cases.length,
      document,
    });

    await this.auditService.record({
      runtimeId: dataset.runtimeId,
      eventType: AuditEventType.EvaluationStarted,
      entityType: AuditEntityType.EvaluationRun,
      entityId: run.id,
      title: 'Regression Started',
      description: `${dataset.name} · v${version.version}`,
      metadata: {
        datasetId: dataset.id,
        datasetName: dataset.name,
        runtimeVersionId: version.id,
        runtimeVersionNumber: version.version,
        totalTests: cases.length,
      },
    });

    return { run, dataset, version };
  }

  private async executeRun(
    runId: string,
    dataset: EvaluationDatasetEntity,
    version: RuntimeVersionEntity,
  ): Promise<RunEvaluationResponse> {
    const run = await this.runRepository.findById(runId);
    if (!run) {
      throw new NotFoundException('Evaluation run not found');
    }

    const document = run.document?.trim() ?? '';
    if (!document) {
      throw new BadRequestException('Evaluation run has no document');
    }

    const cases = await this.caseRepository.findByDatasetId(dataset.id);
    let passed = 0;
    let failed = 0;
    let totalLatency = 0;

    try {
      const extraction = await this.executeExtraction({
        runtimeId: dataset.runtimeId,
        version,
        document,
        evaluationRunId: runId,
        datasetId: dataset.id,
      });

      for (const testCase of cases) {
        const caseStartedAt = Date.now();

        try {
          const caseResult = await this.executeQuestion({
            runtimeId: dataset.runtimeId,
            version,
            testCase,
            structuredData: extraction.structuredData,
            evaluationRunId: runId,
          });

          const comparison = await this.answerComparator.compare(
            caseResult.actualAnswer,
            testCase.expectedAnswer,
          );
          const latency = Date.now() - caseStartedAt;
          totalLatency += latency;

          await this.resultRepository.create({
            evaluationRunId: runId,
            evaluationCaseId: testCase.id,
            expectedAnswer: testCase.expectedAnswer,
            actualAnswer: caseResult.actualAnswer,
            passed: comparison.passed,
            latency,
            error: null,
            traceId: caseResult.traceId ?? extraction.traceId,
          });

          if (comparison.passed) {
            passed += 1;
          } else {
            failed += 1;
          }
        } catch (error) {
          failed += 1;
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          const latency = Date.now() - caseStartedAt;
          totalLatency += latency;

          await this.resultRepository.create({
            evaluationRunId: runId,
            evaluationCaseId: testCase.id,
            expectedAnswer: testCase.expectedAnswer,
            actualAnswer: null,
            passed: false,
            latency,
            error: message,
            traceId: extraction.traceId,
          });
        }
      }

      const score = this.computeScore(passed, cases.length);
      const completed = await this.runRepository.complete(runId, {
        status: EvaluationRunStatus.Completed,
        passed,
        failed,
        score: score.toFixed(2),
        completedAt: new Date(),
      });

      if (!completed) {
        throw new NotFoundException('Evaluation run not found');
      }

      await this.auditService.record({
        runtimeId: dataset.runtimeId,
        eventType: AuditEventType.EvaluationCompleted,
        entityType: AuditEntityType.EvaluationRun,
        entityId: completed.id,
        title: 'Regression Completed',
        description: `${dataset.name} · ${score}%`,
        metadata: {
          datasetId: dataset.id,
          datasetName: dataset.name,
          runtimeVersionId: version.id,
          runtimeVersionNumber: version.version,
          score,
          passed,
          failed,
          totalTests: cases.length,
          durationMs: totalLatency,
          averageLatencyMs:
            cases.length > 0 ? Math.round(totalLatency / cases.length) : 0,
        },
      });

      return {
        evaluationRunId: completed.id,
        score: Number(completed.score),
        passed: completed.passed,
        failed: completed.failed,
      };
    } catch (error) {
      await this.runRepository.complete(runId, {
        status: EvaluationRunStatus.Failed,
        passed,
        failed,
        score: this.computeScore(passed, cases.length).toFixed(2),
        completedAt: new Date(),
      });
      throw error;
    }
  }

  async getRun(id: string): Promise<EvaluationRunDetailResponse> {
    const run = await this.runRepository.findById(id);
    if (!run) {
      throw new NotFoundException('Evaluation run not found');
    }

    const dataset = await this.getDatasetOrThrow(run.datasetId);
    const version = await this.versionRepository.findById(run.runtimeVersionId);
    const results = await this.resultRepository.findByRunId(run.id);
    const cases = await this.caseRepository.findByDatasetId(run.datasetId);
    const caseById = new Map(cases.map((item) => [item.id, item]));

    return {
      ...this.toRunSummary(run, dataset, version),
      document: run.document,
      results: results.map((result) => {
        const testCase = caseById.get(result.evaluationCaseId);
        return this.toResultResponse(result, testCase, run.document);
      }),
    };
  }

  async getRuntimeHistory(
    runtimeId: string,
  ): Promise<EvaluationRunSummaryResponse[]> {
    const runtime = await this.runtimeRepository.findById(runtimeId);
    if (!runtime) {
      throw new NotFoundException('Runtime not found');
    }

    const datasets = await this.datasetRepository.findByRuntimeId(runtimeId);
    const datasetById = new Map(datasets.map((item) => [item.id, item]));
    const runs = await this.runRepository.findByDatasetIds(
      datasets.map((item) => item.id),
    );

    const versionIds = [...new Set(runs.map((run) => run.runtimeVersionId))];
    const versions = await Promise.all(
      versionIds.map((id) => this.versionRepository.findById(id)),
    );
    const versionById = new Map(
      versions
        .filter((item): item is RuntimeVersionEntity => item !== null)
        .map((item) => [item.id, item]),
    );

    return runs.map((run) =>
      this.toRunSummary(
        run,
        datasetById.get(run.datasetId) ?? null,
        versionById.get(run.runtimeVersionId) ?? null,
      ),
    );
  }

  async compare(dto: CompareVersionsDto): Promise<CompareVersionsResponse> {
    if (dto.runtimeVersionA === dto.runtimeVersionB) {
      throw new BadRequestException(
        'Runtime versions must be different for comparison',
      );
    }

    const dataset = await this.getDatasetOrThrow(dto.datasetId);
    const versionA = await this.getVersionOrThrow(dto.runtimeVersionA);
    const versionB = await this.getVersionOrThrow(dto.runtimeVersionB);

    if (
      versionA.runtimeId !== dataset.runtimeId ||
      versionB.runtimeId !== dataset.runtimeId
    ) {
      throw new BadRequestException(
        'Both runtime versions must belong to the same runtime as the dataset',
      );
    }

    const runA = await this.runRepository.findLatestCompletedByDatasetAndVersion(
      dataset.id,
      versionA.id,
    );
    const runB = await this.runRepository.findLatestCompletedByDatasetAndVersion(
      dataset.id,
      versionB.id,
    );

    if (!runA || !runB) {
      throw new NotFoundException(
        'Both runtime versions need a completed evaluation run on this dataset',
      );
    }

    const [resultsA, resultsB, cases] = await Promise.all([
      this.resultRepository.findByRunId(runA.id),
      this.resultRepository.findByRunId(runB.id),
      this.caseRepository.findByDatasetId(dataset.id),
    ]);

    const caseById = new Map(cases.map((item) => [item.id, item]));
    const passedA = new Map(
      resultsA.map((item) => [item.evaluationCaseId, item.passed]),
    );
    const passedB = new Map(
      resultsB.map((item) => [item.evaluationCaseId, item.passed]),
    );

    const caseIds = new Set([...passedA.keys(), ...passedB.keys()]);
    const improvedCases: CompareVersionsResponse['improvedCases'] = [];
    const regressedCases: CompareVersionsResponse['regressedCases'] = [];

    for (const caseId of caseIds) {
      const aPassed = passedA.get(caseId) ?? false;
      const bPassed = passedB.get(caseId) ?? false;
      const caseName = caseById.get(caseId)?.name ?? 'Unknown case';

      if (!aPassed && bPassed) {
        improvedCases.push({ evaluationCaseId: caseId, caseName });
      }

      if (aPassed && !bPassed) {
        regressedCases.push({ evaluationCaseId: caseId, caseName });
      }
    }

    const scoreA = Number(runA.score);
    const scoreB = Number(runB.score);

    return {
      scoreA,
      scoreB,
      difference: Number((scoreB - scoreA).toFixed(2)),
      improvedCases,
      regressedCases,
      runAId: runA.id,
      runBId: runB.id,
    };
  }

  private async executeExtraction(input: {
    runtimeId: string;
    version: RuntimeVersionEntity;
    document: string;
    evaluationRunId: string;
    datasetId: string;
  }): Promise<{
    structuredData: Record<string, unknown>;
    traceId: string | null;
  }> {
    const extractMessages = buildExtractionMessages({
      instructions: input.version.instructions,
      document: input.document,
    });

    try {
      const extract = await this.langfuseService.instrumentComplete(
        this.aiProvider,
        {
          name: 'evaluation.extract',
          messages: extractMessages,
          instructions: input.version.instructions,
          document: input.document,
          json: true,
          metadata: {
            runtimeId: input.runtimeId,
            runtimeVersionId: input.version.id,
            evaluationRunId: input.evaluationRunId,
            datasetId: input.datasetId,
            operation: 'extract',
          },
        },
      );

      return {
        structuredData: parseExtractionResponse(extract.completion.content, {
          traceId: extract.traceId,
        }).structuredData,
        traceId: extract.traceId,
      };
    } catch (error) {
      this.rethrowAiError(error);
    }
  }

  private async executeQuestion(input: {
    runtimeId: string;
    version: RuntimeVersionEntity;
    testCase: EvaluationCaseEntity;
    structuredData: Record<string, unknown>;
    evaluationRunId: string;
  }): Promise<{ actualAnswer: string; traceId: string | null }> {
    const questionMessages = buildQuestionMessages({
      structuredData: input.structuredData,
      question: input.testCase.question,
    });

    try {
      const answer = await this.langfuseService.instrumentComplete(
        this.aiProvider,
        {
          name: 'evaluation.question',
          messages: questionMessages,
          question: input.testCase.question,
          metadata: {
            runtimeId: input.runtimeId,
            runtimeVersionId: input.version.id,
            evaluationRunId: input.evaluationRunId,
            datasetId: input.testCase.datasetId,
            evaluationCaseId: input.testCase.id,
            operation: 'question',
          },
        },
      );

      return {
        actualAnswer: answer.completion.content.trim(),
        traceId: answer.traceId,
      };
    } catch (error) {
      this.rethrowAiError(error);
    }
  }

  private async getDatasetOrThrow(
    datasetId: string,
  ): Promise<EvaluationDatasetEntity> {
    const dataset = await this.datasetRepository.findById(datasetId);
    if (!dataset) {
      throw new NotFoundException('Evaluation dataset not found');
    }
    return dataset;
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

  private normalizeTags(tags?: string[]): string[] | null {
    const normalized =
      tags
        ?.map((tag) => tag.trim())
        .filter((tag) => tag.length > 0) ?? [];
    return normalized.length > 0 ? normalized : null;
  }

  private computeScore(passed: number, total: number): number {
    if (total === 0) {
      return 0;
    }
    return Number(((passed / total) * 100).toFixed(2));
  }

  private toDatasetResponse(
    dataset: EvaluationDatasetEntity,
  ): EvaluationDatasetResponse {
    return {
      id: dataset.id,
      runtimeId: dataset.runtimeId,
      name: dataset.name,
      description: dataset.description,
      createdAt: dataset.createdAt.toISOString(),
    };
  }

  private toCaseResponse(item: EvaluationCaseEntity): EvaluationCaseResponse {
    return {
      id: item.id,
      datasetId: item.datasetId,
      name: item.name,
      question: item.question,
      expectedAnswer: item.expectedAnswer,
      tags: item.tags ?? [],
      createdAt: item.createdAt.toISOString(),
    };
  }

  private toRunSummary(
    run: EvaluationRunEntity,
    dataset: EvaluationDatasetEntity | null,
    version: RuntimeVersionEntity | null,
  ): EvaluationRunSummaryResponse {
    return {
      id: run.id,
      datasetId: run.datasetId,
      datasetName: dataset?.name ?? 'Unknown dataset',
      runtimeVersionId: run.runtimeVersionId,
      runtimeVersionNumber: version?.version ?? null,
      runtimeVersionStatus: version?.status ?? null,
      status: run.status,
      totalTests: run.totalTests,
      passed: run.passed,
      failed: run.failed,
      score: Number(run.score),
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    };
  }

  private toResultResponse(
    result: {
      id: string;
      evaluationCaseId: string;
      expectedAnswer: string;
      actualAnswer: string | null;
      passed: boolean;
      latency: number;
      error: string | null;
      traceId?: string | null;
    },
    testCase: EvaluationCaseEntity | undefined,
    runDocument: string | null,
  ): EvaluationResultResponse {
    return {
      id: result.id,
      evaluationCaseId: result.evaluationCaseId,
      caseName: testCase?.name ?? 'Unknown case',
      expectedAnswer: result.expectedAnswer,
      actualAnswer: result.actualAnswer,
      passed: result.passed,
      latency: result.latency,
      error: result.error,
      document: runDocument ?? '',
      question: testCase?.question ?? '',
      traceId: result.traceId ?? null,
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
