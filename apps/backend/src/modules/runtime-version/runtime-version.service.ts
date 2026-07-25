import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditEntityType,
  AuditEventType,
} from '../../repositories/audit-event/audit-event.entity';
import {
  RuntimeVersionEntity,
  RuntimeVersionStatus,
} from '../../repositories/runtime-version/runtime-version.entity';
import { RuntimeVersionRepository } from '../../repositories/runtime-version/runtime-version.repository';
import { RuntimeRepository } from '../../repositories/runtime/runtime.repository';
import { AuditService } from '../audit/audit.service';
import { UpdateDraftDto } from './runtime-version.dto';
import { RuntimeVersionResponse } from './runtime-version.types';

@Injectable()
export class RuntimeVersionService {
  constructor(
    private readonly runtimeRepository: RuntimeRepository,
    private readonly versionRepository: RuntimeVersionRepository,
    private readonly auditService: AuditService,
  ) {}

  async listVersions(runtimeId: string): Promise<RuntimeVersionResponse[]> {
    await this.ensureRuntimeExists(runtimeId);
    const versions = await this.versionRepository.findByRuntimeId(runtimeId);
    return versions.map((version) => this.toResponse(version));
  }

  async getDraft(runtimeId: string): Promise<RuntimeVersionResponse> {
    await this.ensureRuntimeExists(runtimeId);
    const draft = await this.versionRepository.findByRuntimeIdAndStatus(
      runtimeId,
      RuntimeVersionStatus.Draft,
    );

    if (!draft) {
      throw new NotFoundException('Draft version not found');
    }

    return this.toResponse(draft);
  }

  async updateDraft(
    runtimeId: string,
    dto: UpdateDraftDto,
  ): Promise<RuntimeVersionResponse> {
    await this.ensureRuntimeExists(runtimeId);
    await this.assertSingleDraftAndPublished(runtimeId);

    const instructions = dto.instructions.trim();
    const existingDraft =
      await this.versionRepository.findByRuntimeIdAndStatus(
        runtimeId,
        RuntimeVersionStatus.Draft,
      );

    if (existingDraft) {
      const updated = await this.versionRepository.updateInstructions(
        existingDraft.id,
        instructions,
      );
      if (!updated) {
        throw new NotFoundException('Draft version not found');
      }

      await this.auditService.record({
        runtimeId,
        eventType: AuditEventType.RuntimeUpdated,
        entityType: AuditEntityType.RuntimeVersion,
        entityId: updated.id,
        title: 'Draft Updated',
        description: `v${updated.version}`,
        metadata: { version: updated.version, status: updated.status },
      });

      return this.toResponse(updated);
    }

    const maxVersion = await this.versionRepository.getMaxVersion(runtimeId);
    const draft = await this.versionRepository.create({
      runtimeId,
      version: maxVersion + 1,
      instructions,
      status: RuntimeVersionStatus.Draft,
    });

    await this.auditService.record({
      runtimeId,
      eventType: AuditEventType.RuntimeVersionCreated,
      entityType: AuditEntityType.RuntimeVersion,
      entityId: draft.id,
      title: 'Runtime Version Created',
      description: `v${draft.version}`,
      metadata: { version: draft.version, status: draft.status },
    });

    return this.toResponse(draft);
  }

  async publish(runtimeId: string): Promise<RuntimeVersionResponse> {
    await this.ensureRuntimeExists(runtimeId);
    await this.assertSingleDraftAndPublished(runtimeId);

    const draft = await this.versionRepository.findByRuntimeIdAndStatus(
      runtimeId,
      RuntimeVersionStatus.Draft,
    );

    if (!draft) {
      throw new BadRequestException('No draft version to publish');
    }

    const published = await this.versionRepository.findByRuntimeIdAndStatus(
      runtimeId,
      RuntimeVersionStatus.Published,
    );

    if (published) {
      await this.versionRepository.updateStatus(
        published.id,
        RuntimeVersionStatus.Archived,
      );
    }

    const newlyPublished = await this.versionRepository.updateStatus(
      draft.id,
      RuntimeVersionStatus.Published,
    );

    if (!newlyPublished) {
      throw new NotFoundException('Draft version not found');
    }

    await this.runtimeRepository.update(runtimeId, {
      activeVersionId: newlyPublished.id,
    });

    await this.auditService.record({
      runtimeId,
      eventType: AuditEventType.RuntimePublished,
      entityType: AuditEntityType.RuntimeVersion,
      entityId: newlyPublished.id,
      title: 'Published',
      description: `Version ${newlyPublished.version}`,
      metadata: {
        version: newlyPublished.version,
        runtimeVersionId: newlyPublished.id,
      },
    });

    return this.toResponse(newlyPublished);
  }

  async getVersionById(versionId: string): Promise<RuntimeVersionResponse> {
    const version = await this.versionRepository.findById(versionId);
    if (!version) {
      throw new NotFoundException('Runtime version not found');
    }
    return this.toResponse(version);
  }

  async createInitialDraft(runtimeId: string): Promise<RuntimeVersionEntity> {
    return this.versionRepository.create({
      runtimeId,
      version: 1,
      instructions: '',
      status: RuntimeVersionStatus.Draft,
    });
  }

  private async ensureRuntimeExists(runtimeId: string): Promise<void> {
    const runtime = await this.runtimeRepository.findById(runtimeId);
    if (!runtime) {
      throw new NotFoundException('Runtime not found');
    }
  }

  private async assertSingleDraftAndPublished(
    runtimeId: string,
  ): Promise<void> {
    const drafts = await this.versionRepository.findAllByRuntimeIdAndStatus(
      runtimeId,
      RuntimeVersionStatus.Draft,
    );
    if (drafts.length > 1) {
      throw new ConflictException('Multiple draft versions exist');
    }

    const published = await this.versionRepository.findAllByRuntimeIdAndStatus(
      runtimeId,
      RuntimeVersionStatus.Published,
    );
    if (published.length > 1) {
      throw new ConflictException('Multiple published versions exist');
    }
  }

  private toResponse(version: RuntimeVersionEntity): RuntimeVersionResponse {
    return {
      id: version.id,
      runtimeId: version.runtimeId,
      version: version.version,
      instructions: version.instructions,
      status: version.status,
      createdAt: version.createdAt.toISOString(),
      updatedAt: version.updatedAt.toISOString(),
    };
  }
}
