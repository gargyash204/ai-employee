import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationResultEntity } from './evaluation-result.entity';

@Injectable()
export class EvaluationResultRepository {
  constructor(
    @InjectRepository(EvaluationResultEntity)
    private readonly repo: Repository<EvaluationResultEntity>,
  ) {}

  create(data: {
    evaluationRunId: string;
    evaluationCaseId: string;
    expectedAnswer: string;
    actualAnswer: string | null;
    passed: boolean;
    latency: number;
    error: string | null;
    traceId?: string | null;
  }): Promise<EvaluationResultEntity> {
    const entity = this.repo.create({
      evaluationRunId: data.evaluationRunId,
      evaluationCaseId: data.evaluationCaseId,
      expectedAnswer: data.expectedAnswer,
      actualAnswer: data.actualAnswer,
      passed: data.passed,
      latency: data.latency,
      error: data.error,
      traceId: data.traceId ?? null,
    });
    return this.repo.save(entity);
  }

  findByRunId(evaluationRunId: string): Promise<EvaluationResultEntity[]> {
    return this.repo.find({
      where: { evaluationRunId },
      order: { id: 'ASC' },
    });
  }
}
