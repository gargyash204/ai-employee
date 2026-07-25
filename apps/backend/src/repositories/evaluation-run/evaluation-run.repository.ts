import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  EvaluationRunEntity,
  EvaluationRunStatus,
} from './evaluation-run.entity';

@Injectable()
export class EvaluationRunRepository {
  constructor(
    @InjectRepository(EvaluationRunEntity)
    private readonly repo: Repository<EvaluationRunEntity>,
  ) {}

  create(data: {
    datasetId: string;
    runtimeVersionId: string;
    status: EvaluationRunStatus;
    totalTests: number;
    document: string;
  }): Promise<EvaluationRunEntity> {
    const entity = this.repo.create({
      datasetId: data.datasetId,
      runtimeVersionId: data.runtimeVersionId,
      status: data.status,
      totalTests: data.totalTests,
      document: data.document,
      passed: 0,
      failed: 0,
      score: '0.00',
      completedAt: null,
    });
    return this.repo.save(entity);
  }

  findById(id: string): Promise<EvaluationRunEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByDatasetIds(datasetIds: string[]): Promise<EvaluationRunEntity[]> {
    if (datasetIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.repo.find({
      where: { datasetId: In(datasetIds) },
      order: { startedAt: 'DESC' },
    });
  }

  findLatestCompletedByDatasetAndVersion(
    datasetId: string,
    runtimeVersionId: string,
  ): Promise<EvaluationRunEntity | null> {
    return this.repo.findOne({
      where: {
        datasetId,
        runtimeVersionId,
        status: EvaluationRunStatus.Completed,
      },
      order: { completedAt: 'DESC' },
    });
  }

  async complete(
    id: string,
    data: {
      status: EvaluationRunStatus;
      passed: number;
      failed: number;
      score: string;
      completedAt: Date;
    },
  ): Promise<EvaluationRunEntity | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    if (
      existing.status === EvaluationRunStatus.Completed ||
      existing.status === EvaluationRunStatus.Failed
    ) {
      return existing;
    }

    existing.status = data.status;
    existing.passed = data.passed;
    existing.failed = data.failed;
    existing.score = data.score;
    existing.completedAt = data.completedAt;
    return this.repo.save(existing);
  }
}
