import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EvaluationDatasetEntity } from '../evaluation-dataset/evaluation-dataset.entity';

@Entity({ name: 'evaluation_cases' })
export class EvaluationCaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'dataset_id', type: 'varchar', length: 36 })
  datasetId!: string;

  @ManyToOne(() => EvaluationDatasetEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dataset_id' })
  dataset!: EvaluationDatasetEntity;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text' })
  question!: string;

  @Column({ name: 'expected_answer', type: 'text' })
  expectedAnswer!: string;

  @Column({ type: 'json', nullable: true })
  tags!: string[] | null;

  @Column({
    name: 'source_session_id',
    type: 'varchar',
    length: 36,
    nullable: true,
  })
  sourceSessionId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
