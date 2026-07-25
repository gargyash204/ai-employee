import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  ExecutionEntity,
  ExecutionStep,
} from '../execution/execution.entity';

@Entity({ name: 'execution_checkpoints' })
export class ExecutionCheckpointEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'execution_id', type: 'varchar', length: 36 })
  executionId!: string;

  @ManyToOne(() => ExecutionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'execution_id' })
  execution!: ExecutionEntity;

  @Column({ type: 'varchar', length: 40 })
  step!: ExecutionStep;

  @Column({ type: 'json' })
  output!: Record<string, unknown>;

  @CreateDateColumn({ name: 'completed_at' })
  completedAt!: Date;
}
