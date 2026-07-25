import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RuntimeEntity } from '../runtime/runtime.entity';

export enum AuditEventType {
  RuntimeCreated = 'RuntimeCreated',
  RuntimeUpdated = 'RuntimeUpdated',
  RuntimeVersionCreated = 'RuntimeVersionCreated',
  RuntimePublished = 'RuntimePublished',
  ExperimentStarted = 'ExperimentStarted',
  ExperimentCompleted = 'ExperimentCompleted',
  QuestionAsked = 'QuestionAsked',
  EvaluationStarted = 'EvaluationStarted',
  EvaluationCompleted = 'EvaluationCompleted',
  ExecutionStarted = 'ExecutionStarted',
  CheckpointCreated = 'CheckpointCreated',
  ExecutionPaused = 'ExecutionPaused',
  ExecutionResumed = 'ExecutionResumed',
  ExecutionCompleted = 'ExecutionCompleted',
  ExecutionFailed = 'ExecutionFailed',
}

export enum AuditEntityType {
  Runtime = 'Runtime',
  RuntimeVersion = 'RuntimeVersion',
  ExperimentSession = 'ExperimentSession',
  EvaluationRun = 'EvaluationRun',
  EvaluationResult = 'EvaluationResult',
  Execution = 'Execution',
  ExecutionCheckpoint = 'ExecutionCheckpoint',
}

@Entity({ name: 'audit_events' })
@Index('IDX_audit_events_runtime_id_created_at', ['runtimeId', 'createdAt'])
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'runtime_id', type: 'varchar', length: 36 })
  runtimeId!: string;

  @ManyToOne(() => RuntimeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runtime_id' })
  runtime!: RuntimeEntity;

  @Column({ name: 'event_type', type: 'varchar', length: 64 })
  eventType!: AuditEventType;

  @Column({ name: 'entity_type', type: 'varchar', length: 64 })
  entityType!: AuditEntityType;

  @Column({ name: 'entity_id', type: 'varchar', length: 36 })
  entityId!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'trace_id', type: 'varchar', length: 64, nullable: true })
  traceId!: string | null;

  @Column({ type: 'json', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
