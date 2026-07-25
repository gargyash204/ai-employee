import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationDatasetEntity } from './evaluation-dataset.entity';

@Injectable()
export class EvaluationDatasetRepository {
  constructor(
    @InjectRepository(EvaluationDatasetEntity)
    private readonly repo: Repository<EvaluationDatasetEntity>,
  ) {}

  create(data: {
    runtimeId: string;
    name: string;
    description: string | null;
  }): Promise<EvaluationDatasetEntity> {
    const entity = this.repo.create({
      runtimeId: data.runtimeId,
      name: data.name,
      description: data.description,
    });
    return this.repo.save(entity);
  }

  findById(id: string): Promise<EvaluationDatasetEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByRuntimeId(runtimeId: string): Promise<EvaluationDatasetEntity[]> {
    return this.repo.find({
      where: { runtimeId },
      order: { createdAt: 'DESC' },
    });
  }

  findByRuntimeIdAndName(
    runtimeId: string,
    name: string,
  ): Promise<EvaluationDatasetEntity | null> {
    return this.repo.findOne({ where: { runtimeId, name } });
  }
}
