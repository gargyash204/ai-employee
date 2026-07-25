import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionStep } from '../execution/execution.entity';
import { ExecutionCheckpointEntity } from './execution-checkpoint.entity';

@Injectable()
export class ExecutionCheckpointRepository {
  constructor(
    @InjectRepository(ExecutionCheckpointEntity)
    private readonly repo: Repository<ExecutionCheckpointEntity>,
  ) {}

  create(data: {
    executionId: string;
    step: ExecutionStep;
    output: Record<string, unknown>;
  }): Promise<ExecutionCheckpointEntity> {
    const entity = this.repo.create({
      executionId: data.executionId,
      step: data.step,
      output: data.output,
    });
    return this.repo.save(entity);
  }

  findByExecutionId(
    executionId: string,
  ): Promise<ExecutionCheckpointEntity[]> {
    return this.repo.find({
      where: { executionId },
      order: { completedAt: 'ASC' },
    });
  }

  findByExecutionIdAndStep(
    executionId: string,
    step: ExecutionStep,
  ): Promise<ExecutionCheckpointEntity | null> {
    return this.repo.findOne({
      where: { executionId, step },
    });
  }
}
