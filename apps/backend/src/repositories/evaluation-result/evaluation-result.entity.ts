import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EvaluationCaseEntity } from '../evaluation-case/evaluation-case.entity';
import { EvaluationRunEntity } from '../evaluation-run/evaluation-run.entity';

@Entity({ name: 'evaluation_results' })
export class EvaluationResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'evaluation_run_id', type: 'varchar', length: 36 })
  evaluationRunId!: string;

  @ManyToOne(() => EvaluationRunEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_run_id' })
  evaluationRun!: EvaluationRunEntity;

  @Column({ name: 'evaluation_case_id', type: 'varchar', length: 36 })
  evaluationCaseId!: string;

  @ManyToOne(() => EvaluationCaseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_case_id' })
  evaluationCase!: EvaluationCaseEntity;

  @Column({ name: 'expected_answer', type: 'text' })
  expectedAnswer!: string;

  @Column({ name: 'actual_answer', type: 'text', nullable: true })
  actualAnswer!: string | null;

  @Column({ type: 'boolean', default: false })
  passed!: boolean;

  @Column({ type: 'int', default: 0 })
  latency!: number;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ name: 'trace_id', type: 'varchar', length: 64, nullable: true })
  traceId!: string | null;
}
