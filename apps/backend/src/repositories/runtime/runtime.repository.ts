import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RuntimeEntity } from './runtime.entity';

@Injectable()
export class RuntimeRepository {
  constructor(
    @InjectRepository(RuntimeEntity)
    private readonly repo: Repository<RuntimeEntity>,
  ) {}

  create(data: {
    name: string;
    description?: string | null;
  }): Promise<RuntimeEntity> {
    const entity = this.repo.create({
      name: data.name,
      description: data.description ?? null,
    });
    return this.repo.save(entity);
  }

  findAll(): Promise<RuntimeEntity[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
    });
  }

  findById(id: string): Promise<RuntimeEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      activeVersionId?: string | null;
    },
  ): Promise<RuntimeEntity | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    if (data.name !== undefined) {
      existing.name = data.name;
    }
    if (data.description !== undefined) {
      existing.description = data.description;
    }
    if (data.activeVersionId !== undefined) {
      existing.activeVersionId = data.activeVersionId;
    }

    return this.repo.save(existing);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) {
      return false;
    }

    if (existing.activeVersionId) {
      existing.activeVersionId = null;
      await this.repo.save(existing);
    }

    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
