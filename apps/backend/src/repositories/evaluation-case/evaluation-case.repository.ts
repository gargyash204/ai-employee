import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationCaseEntity } from './evaluation-case.entity';

@Injectable()
export class EvaluationCaseRepository {
  constructor(
    @InjectRepository(EvaluationCaseEntity)
    private readonly repo: Repository<EvaluationCaseEntity>,
  ) {}

  create(data: {
    datasetId: string;
    name: string;
    question: string;
    expectedAnswer: string;
    tags: string[] | null;
    sourceSessionId: string | null;
  }): Promise<EvaluationCaseEntity> {
    const entity = this.repo.create({
      datasetId: data.datasetId,
      name: data.name,
      question: data.question,
      expectedAnswer: data.expectedAnswer,
      tags: data.tags,
      sourceSessionId: data.sourceSessionId,
    });
    return this.repo.save(entity);
  }

  findById(id: string): Promise<EvaluationCaseEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByDatasetId(datasetId: string): Promise<EvaluationCaseEntity[]> {
    return this.repo.find({
      where: { datasetId },
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      question: string;
      expectedAnswer: string;
      tags: string[] | null;
    }>,
  ): Promise<EvaluationCaseEntity | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    if (data.name !== undefined) {
      existing.name = data.name;
    }
    if (data.question !== undefined) {
      existing.question = data.question;
    }
    if (data.expectedAnswer !== undefined) {
      existing.expectedAnswer = data.expectedAnswer;
    }
    if (data.tags !== undefined) {
      existing.tags = data.tags;
    }

    return this.repo.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
