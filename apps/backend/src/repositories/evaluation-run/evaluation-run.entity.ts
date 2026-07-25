import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EvaluationDatasetEntity } from '../evaluation-dataset/evaluation-dataset.entity';
import { RuntimeVersionEntity } from '../runtime-version/runtime-version.entity';

export enum EvaluationRunStatus {
  Running = 'Running',
  Completed = 'Completed',
  Failed = 'Failed',
}

@Entity({ name: 'evaluation_runs' })
export class EvaluationRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'dataset_id', type: 'varchar', length: 36 })
  datasetId!: string;

  @ManyToOne(() => EvaluationDatasetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dataset_id' })
  dataset!: EvaluationDatasetEntity;

  @Column({ name: 'runtime_version_id', type: 'varchar', length: 36 })
  runtimeVersionId!: string;

  @ManyToOne(() => RuntimeVersionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runtime_version_id' })
  runtimeVersion!: RuntimeVersionEntity;

  @Column({ type: 'varchar', length: 20 })
  status!: EvaluationRunStatus;

  @Column({ type: 'text', nullable: true })
  document!: string | null;

  @Column({ name: 'total_tests', type: 'int', default: 0 })
  totalTests!: number;

  @Column({ type: 'int', default: 0 })
  passed!: number;

  @Column({ type: 'int', default: 0 })
  failed!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score!: string;

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
