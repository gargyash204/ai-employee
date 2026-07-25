import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditEntityType,
  AuditEventEntity,
  AuditEventType,
} from './audit-event.entity';

@Injectable()
export class AuditEventRepository {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly repo: Repository<AuditEventEntity>,
  ) {}

  create(data: {
    runtimeId: string;
    eventType: AuditEventType;
    entityType: AuditEntityType;
    entityId: string;
    title: string;
    description?: string | null;
    traceId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<AuditEventEntity> {
    const entity = this.repo.create({
      runtimeId: data.runtimeId,
      eventType: data.eventType,
      entityType: data.entityType,
      entityId: data.entityId,
      title: data.title,
      description: data.description ?? null,
      traceId: data.traceId ?? null,
      metadata: data.metadata ?? null,
    });
    return this.repo.save(entity);
  }

  findById(id: string): Promise<AuditEventEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByRuntimeId(
    runtimeId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<AuditEventEntity[]> {
    return this.repo.find({
      where: { runtimeId },
      order: { createdAt: 'DESC' },
      take: options?.limit,
      skip: options?.offset,
    });
  }

  countByRuntimeId(runtimeId: string): Promise<number> {
    return this.repo.count({ where: { runtimeId } });
  }

  findLatestByRuntimeId(
    runtimeId: string,
  ): Promise<AuditEventEntity | null> {
    return this.repo.findOne({
      where: { runtimeId },
      order: { createdAt: 'DESC' },
    });
  }

  findByEntity(
    entityType: AuditEntityType,
    entityId: string,
  ): Promise<AuditEventEntity[]> {
    return this.repo.find({
      where: { entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }
}
