import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ExecutionEntity,
  ExecutionStatus,
  ExecutionStep,
} from './execution.entity';

@Injectable()
export class ExecutionRepository {
  constructor(
    @InjectRepository(ExecutionEntity)
    private readonly repo: Repository<ExecutionEntity>,
  ) {}

  create(data: {
    runtimeId: string;
    runtimeVersionId: string;
    status: ExecutionStatus;
    currentStep: ExecutionStep;
    document: string;
    tempFilePath?: string | null;
    parserError?: string | null;
  }): Promise<ExecutionEntity> {
    const entity = this.repo.create({
      runtimeId: data.runtimeId,
      runtimeVersionId: data.runtimeVersionId,
      status: data.status,
      currentStep: data.currentStep,
      document: data.document,
      tempFilePath: data.tempFilePath ?? null,
      parserError: data.parserError ?? null,
      finalOutput: null,
      retryCount: 0,
      completedAt: null,
    });
    return this.repo.save(entity);
  }

  findById(id: string): Promise<ExecutionEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByRuntimeId(runtimeId: string): Promise<ExecutionEntity[]> {
    return this.repo.find({
      where: { runtimeId },
      order: { startedAt: 'DESC' },
    });
  }

  countByRuntimeId(runtimeId: string): Promise<number> {
    return this.repo.count({ where: { runtimeId } });
  }

  countByRuntimeIdAndStatus(
    runtimeId: string,
    status: ExecutionStatus,
  ): Promise<number> {
    return this.repo.count({ where: { runtimeId, status } });
  }

  async update(
    id: string,
    data: {
      status?: ExecutionStatus;
      currentStep?: ExecutionStep;
      document?: string;
      tempFilePath?: string | null;
      parserError?: string | null;
      finalOutput?: Record<string, unknown> | null;
      retryCount?: number;
      completedAt?: Date | null;
    },
  ): Promise<ExecutionEntity | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    if (data.status !== undefined) {
      existing.status = data.status;
    }
    if (data.currentStep !== undefined) {
      existing.currentStep = data.currentStep;
    }
    if (data.document !== undefined) {
      existing.document = data.document;
    }
    if (data.tempFilePath !== undefined) {
      existing.tempFilePath = data.tempFilePath;
    }
    if (data.parserError !== undefined) {
      existing.parserError = data.parserError;
    }
    if (data.finalOutput !== undefined) {
      existing.finalOutput = data.finalOutput;
    }
    if (data.retryCount !== undefined) {
      existing.retryCount = data.retryCount;
    }
    if (data.completedAt !== undefined) {
      existing.completedAt = data.completedAt;
    }

    return this.repo.save(existing);
  }
}
