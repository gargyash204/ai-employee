import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  AuditEntityType,
  AuditEventType,
} from '../../repositories/audit-event/audit-event.entity';
import { RuntimeEntity } from '../../repositories/runtime/runtime.entity';
import { RuntimeRepository } from '../../repositories/runtime/runtime.repository';
import { AuditService } from '../audit/audit.service';
import { CreateRuntimeDto, UpdateRuntimeDto } from './runtime.dto';
import { RuntimeVersionService } from '../runtime-version/runtime-version.service';
import { RuntimeResponse } from './runtime.types';

@Injectable()
export class RuntimeService {
  constructor(
    private readonly runtimeRepository: RuntimeRepository,
    private readonly versionService: RuntimeVersionService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateRuntimeDto): Promise<RuntimeResponse> {
    try {
      const runtime = await this.runtimeRepository.create({
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
      });

      try {
        const draft = await this.versionService.createInitialDraft(runtime.id);
        await this.auditService.record({
          runtimeId: runtime.id,
          eventType: AuditEventType.RuntimeCreated,
          entityType: AuditEntityType.Runtime,
          entityId: runtime.id,
          title: 'Runtime Created',
          description: runtime.name,
          metadata: { name: runtime.name },
        });
        await this.auditService.record({
          runtimeId: runtime.id,
          eventType: AuditEventType.RuntimeVersionCreated,
          entityType: AuditEntityType.RuntimeVersion,
          entityId: draft.id,
          title: 'Runtime Version Created',
          description: `v${draft.version}`,
          metadata: { version: draft.version, status: draft.status },
        });
      } catch (error) {
        await this.runtimeRepository.delete(runtime.id);
        throw error;
      }

      return this.toResponse(runtime);
    } catch (error) {
      this.rethrowIfDuplicateName(error);
      throw error;
    }
  }

  async findAll(): Promise<RuntimeResponse[]> {
    const runtimes = await this.runtimeRepository.findAll();
    return runtimes.map((runtime) => this.toResponse(runtime));
  }

  async findById(id: string): Promise<RuntimeResponse> {
    const runtime = await this.runtimeRepository.findById(id);
    if (!runtime) {
      throw new NotFoundException('Runtime not found');
    }
    return this.toResponse(runtime);
  }

  async update(id: string, dto: UpdateRuntimeDto): Promise<RuntimeResponse> {
    try {
      const runtime = await this.runtimeRepository.update(id, {
        name: dto.name?.trim(),
        description:
          dto.description !== undefined
            ? dto.description.trim() || null
            : undefined,
      });

      if (!runtime) {
        throw new NotFoundException('Runtime not found');
      }

      await this.auditService.record({
        runtimeId: runtime.id,
        eventType: AuditEventType.RuntimeUpdated,
        entityType: AuditEntityType.Runtime,
        entityId: runtime.id,
        title: 'Runtime Updated',
        description: runtime.name,
        metadata: {
          name: runtime.name,
          description: runtime.description,
        },
      });

      return this.toResponse(runtime);
    } catch (error) {
      this.rethrowIfDuplicateName(error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.runtimeRepository.delete(id);
    if (!deleted) {
      throw new NotFoundException('Runtime not found');
    }
  }

  private toResponse(runtime: RuntimeEntity): RuntimeResponse {
    return {
      id: runtime.id,
      name: runtime.name,
      description: runtime.description,
      activeVersionId: runtime.activeVersionId,
      createdAt: runtime.createdAt.toISOString(),
      updatedAt: runtime.updatedAt.toISOString(),
    };
  }

  private rethrowIfDuplicateName(error: unknown): void {
    if (
      error instanceof QueryFailedError &&
      typeof error.driverError === 'object' &&
      error.driverError !== null &&
      'code' in error.driverError &&
      error.driverError.code === 'ER_DUP_ENTRY'
    ) {
      throw new ConflictException('A runtime with this name already exists');
    }
  }
}
