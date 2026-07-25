import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { EvaluationCaseEntity } from '../repositories/evaluation-case/evaluation-case.entity';
import { EvaluationDatasetEntity } from '../repositories/evaluation-dataset/evaluation-dataset.entity';
import { EvaluationResultEntity } from '../repositories/evaluation-result/evaluation-result.entity';
import { EvaluationRunEntity } from '../repositories/evaluation-run/evaluation-run.entity';
import { ExperimentSessionEntity } from '../repositories/experiment-session/experiment-session.entity';
import { ExecutionCheckpointEntity } from '../repositories/execution-checkpoint/execution-checkpoint.entity';
import { ExecutionEntity } from '../repositories/execution/execution.entity';
import { AuditEventEntity } from '../repositories/audit-event/audit-event.entity';
import { RuntimeVersionEntity } from '../repositories/runtime-version/runtime-version.entity';
import { RuntimeEntity } from '../repositories/runtime/runtime.entity';

function loadEnvFiles(): void {
  const path = resolve(process.cwd(), '../../.env');
  if (existsSync(path)) {
    config({ path, quiet: true });
  }
}

loadEnvFiles();

export const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? '3306'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [
    RuntimeEntity,
    RuntimeVersionEntity,
    ExperimentSessionEntity,
    EvaluationDatasetEntity,
    EvaluationCaseEntity,
    EvaluationRunEntity,
    EvaluationResultEntity,
    ExecutionEntity,
    ExecutionCheckpointEntity,
    AuditEventEntity,
  ],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsTableName: 'migrations',
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
