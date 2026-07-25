import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RuntimeVersionEntity,
  RuntimeVersionStatus,
} from './runtime-version.entity';

@Injectable()
export class RuntimeVersionRepository {
  constructor(
    @InjectRepository(RuntimeVersionEntity)
    private readonly repo: Repository<RuntimeVersionEntity>,
  ) {}

  create(data: {
    runtimeId: string;
    version: number;
    instructions: string;
    status: RuntimeVersionStatus;
  }): Promise<RuntimeVersionEntity> {
    const entity = this.repo.create({
      runtimeId: data.runtimeId,
      version: data.version,
      instructions: data.instructions,
      status: data.status,
    });
    return this.repo.save(entity);
  }

  findById(id: string): Promise<RuntimeVersionEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByRuntimeId(runtimeId: string): Promise<RuntimeVersionEntity[]> {
    return this.repo.find({
      where: { runtimeId },
      order: { version: 'DESC' },
    });
  }

  findByRuntimeIdAndStatus(
    runtimeId: string,
    status: RuntimeVersionStatus,
  ): Promise<RuntimeVersionEntity | null> {
    return this.repo.findOne({ where: { runtimeId, status } });
  }

  countByRuntimeIdAndStatus(
    runtimeId: string,
    status: RuntimeVersionStatus,
  ): Promise<number> {
    return this.repo.count({ where: { runtimeId, status } });
  }

  findAllByRuntimeIdAndStatus(
    runtimeId: string,
    status: RuntimeVersionStatus,
  ): Promise<RuntimeVersionEntity[]> {
    return this.repo.find({ where: { runtimeId, status } });
  }

  async getMaxVersion(runtimeId: string): Promise<number> {
    const latest = await this.repo.find({
      where: { runtimeId },
      order: { version: 'DESC' },
      take: 1,
    });

    return latest[0]?.version ?? 0;
  }

  async updateInstructions(
    id: string,
    instructions: string,
  ): Promise<RuntimeVersionEntity | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    existing.instructions = instructions;
    return this.repo.save(existing);
  }

  async updateStatus(
    id: string,
    status: RuntimeVersionStatus,
  ): Promise<RuntimeVersionEntity | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    existing.status = status;
    return this.repo.save(existing);
  }
}
