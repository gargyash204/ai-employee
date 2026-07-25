import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RuntimeEntity } from '../runtime/runtime.entity';

export enum RuntimeVersionStatus {
  Draft = 'Draft',
  Published = 'Published',
  Archived = 'Archived',
}

@Entity({ name: 'runtime_versions' })
export class RuntimeVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'runtime_id', type: 'varchar', length: 36 })
  runtimeId!: string;

  @ManyToOne(() => RuntimeEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runtime_id' })
  runtime!: RuntimeEntity;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'text' })
  instructions!: string;

  @Column({
    type: 'enum',
    enum: RuntimeVersionStatus,
    default: RuntimeVersionStatus.Draft,
  })
  status!: RuntimeVersionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
