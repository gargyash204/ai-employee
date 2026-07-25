import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExperimentSessionEntity } from './experiment-session.entity';

@Injectable()
export class ExperimentSessionRepository {
  constructor(
    @InjectRepository(ExperimentSessionEntity)
    private readonly repo: Repository<ExperimentSessionEntity>,
  ) {}

  create(data: {
    runtimeId: string;
    versionAId: string;
    versionBId: string | null;
    document: string;
    extractionA: Record<string, unknown>;
    extractionB: Record<string, unknown> | null;
    summaryA: string;
    summaryB: string | null;
    evaluationRunId?: string | null;
  }): Promise<ExperimentSessionEntity> {
    const entity = this.repo.create({
      runtimeId: data.runtimeId,
      versionAId: data.versionAId,
      versionBId: data.versionBId,
      document: data.document,
      extractionA: data.extractionA,
      extractionB: data.extractionB,
      summaryA: data.summaryA,
      summaryB: data.summaryB,
      evaluationRunId: data.evaluationRunId ?? null,
    });
    return this.repo.save(entity);
  }

  findById(id: string): Promise<ExperimentSessionEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async setEvaluationRunId(
    id: string,
    evaluationRunId: string,
  ): Promise<ExperimentSessionEntity | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }
    existing.evaluationRunId = evaluationRunId;
    return this.repo.save(existing);
  }

  countByRuntimeId(runtimeId: string): Promise<number> {
    return this.repo.count({ where: { runtimeId } });
  }
}
