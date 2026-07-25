import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EvaluationRunEntity } from '../evaluation-run/evaluation-run.entity';
import { RuntimeEntity } from '../runtime/runtime.entity';
import { RuntimeVersionEntity } from '../runtime-version/runtime-version.entity';

@Entity({ name: 'experiment_sessions' })
export class ExperimentSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'runtime_id', type: 'varchar', length: 36 })
  runtimeId!: string;

  @ManyToOne(() => RuntimeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runtime_id' })
  runtime!: RuntimeEntity;

  @Column({ name: 'version_a_id', type: 'varchar', length: 36 })
  versionAId!: string;

  @ManyToOne(() => RuntimeVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'version_a_id' })
  versionA!: RuntimeVersionEntity;

  @Column({
    name: 'version_b_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  versionBId!: string | null;

  @ManyToOne(() => RuntimeVersionEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'version_b_id' })
  versionB!: RuntimeVersionEntity | null;

  @Column({ type: 'text' })
  document!: string;

  @Column({ name: 'extraction_a', type: 'json' })
  extractionA!: Record<string, unknown>;

  @Column({ name: 'extraction_b', type: 'json', nullable: true })
  extractionB!: Record<string, unknown> | null;

  @Column({ name: 'summary_a', type: 'text' })
  summaryA!: string;

  @Column({ name: 'summary_b', type: 'text', nullable: true })
  summaryB!: string | null;

  @Column({
    name: 'evaluation_run_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  evaluationRunId!: string | null;

  @ManyToOne(() => EvaluationRunEntity, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'evaluation_run_id' })
  evaluationRun!: EvaluationRunEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
