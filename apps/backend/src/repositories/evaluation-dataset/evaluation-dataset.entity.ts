import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RuntimeEntity } from '../runtime/runtime.entity';

@Entity({ name: 'evaluation_datasets' })
export class EvaluationDatasetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'runtime_id', type: 'varchar', length: 36 })
  runtimeId!: string;

  @ManyToOne(() => RuntimeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runtime_id' })
  runtime!: RuntimeEntity;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
