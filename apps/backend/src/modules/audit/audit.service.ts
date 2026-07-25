import { Injectable } from '@nestjs/common';
import {
  AuditEntityType,
  AuditEventEntity,
  AuditEventType,
} from '../../repositories/audit-event/audit-event.entity';
import { AuditEventRepository } from '../../repositories/audit-event/audit-event.repository';

export type RecordAuditEventInput = {
  runtimeId: string;
  eventType: AuditEventType;
  entityType: AuditEntityType;
  entityId: string;
  title: string;
  description?: string | null;
  traceId?: string | null;
  metadata?: Record<string, unknown> | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditEventRepository) {}

  record(input: RecordAuditEventInput): Promise<AuditEventEntity> {
    return this.auditRepository.create({
      runtimeId: input.runtimeId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      title: input.title,
      description: input.description ?? null,
      traceId: input.traceId ?? null,
      metadata: input.metadata ?? null,
    });
  }

  findById(id: string): Promise<AuditEventEntity | null> {
    return this.auditRepository.findById(id);
  }

  findByRuntimeId(
    runtimeId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<AuditEventEntity[]> {
    return this.auditRepository.findByRuntimeId(runtimeId, options);
  }

  countByRuntimeId(runtimeId: string): Promise<number> {
    return this.auditRepository.countByRuntimeId(runtimeId);
  }

  findLatestByRuntimeId(runtimeId: string): Promise<AuditEventEntity | null> {
    return this.auditRepository.findLatestByRuntimeId(runtimeId);
  }
}
