import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RuntimeEntity } from '../runtime/runtime.entity';
import { RuntimeVersionEntity } from '../runtime-version/runtime-version.entity';

export enum ExecutionStatus {
  Queued = 'Queued',
  Running = 'Running',
  Paused = 'Paused',
  Completed = 'Completed',
  Failed = 'Failed',
}

export enum ExecutionStep {
  Queued = 'Queued',
  ParsingDocument = 'ParsingDocument',
  ReadingDocument = 'ReadingDocument',
  ExtractStructuredData = 'ExtractStructuredData',
  GenerateAnswers = 'GenerateAnswers',
  ValidateResult = 'ValidateResult',
  SaveOutput = 'SaveOutput',
  Completed = 'Completed',
}

@Entity({ name: 'executions' })
export class ExecutionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'runtime_id', type: 'varchar', length: 36 })
  runtimeId!: string;

  @ManyToOne(() => RuntimeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runtime_id' })
  runtime!: RuntimeEntity;

  @Column({ name: 'runtime_version_id', type: 'varchar', length: 36 })
  runtimeVersionId!: string;

  @ManyToOne(() => RuntimeVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runtime_version_id' })
  runtimeVersion!: RuntimeVersionEntity;

  @Column({ type: 'varchar', length: 20 })
  status!: ExecutionStatus;

  @Column({ name: 'current_step', type: 'varchar', length: 40 })
  currentStep!: ExecutionStep;

  @Column({ type: 'text' })
  document!: string;

  @Column({ name: 'temp_file_path', type: 'varchar', length: 512, nullable: true })
  tempFilePath!: string | null;

  @Column({ name: 'parser_error', type: 'text', nullable: true })
  parserError!: string | null;

  @Column({ name: 'final_output', type: 'json', nullable: true })
  finalOutput!: Record<string, unknown> | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;

  @CreateDateColumn({ name: 'started_at' })
  startedAt!: Date;

  @Column({
    name: 'completed_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  completedAt!: Date | null;
}
