import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { LangfuseModule } from '../langfuse/langfuse.module';
import { EvaluationDatasetRepositoryModule } from '../../repositories/evaluation-dataset/evaluation-dataset.repository.module';
import { EvaluationCaseRepositoryModule } from '../../repositories/evaluation-case/evaluation-case.repository.module';
import { EvaluationResultRepositoryModule } from '../../repositories/evaluation-result/evaluation-result.repository.module';
import { EvaluationRunRepositoryModule } from '../../repositories/evaluation-run/evaluation-run.repository.module';
import { ExecutionCheckpointRepositoryModule } from '../../repositories/execution-checkpoint/execution-checkpoint.repository.module';
import { ExecutionRepositoryModule } from '../../repositories/execution/execution.repository.module';
import { ExperimentSessionRepositoryModule } from '../../repositories/experiment-session/experiment-session.repository.module';
import { RuntimeRepositoryModule } from '../../repositories/runtime/runtime.repository.module';
import { RuntimeVersionRepositoryModule } from '../../repositories/runtime-version/runtime-version.repository.module';
import { ObservabilityController } from './observability.controller';
import { ObservabilityService } from './observability.service';

@Module({
  imports: [
    AuditModule,
    LangfuseModule,
    RuntimeRepositoryModule,
    RuntimeVersionRepositoryModule,
    ExecutionRepositoryModule,
    ExecutionCheckpointRepositoryModule,
    ExperimentSessionRepositoryModule,
    EvaluationDatasetRepositoryModule,
    EvaluationCaseRepositoryModule,
    EvaluationRunRepositoryModule,
    EvaluationResultRepositoryModule,
  ],
  controllers: [ObservabilityController],
  providers: [ObservabilityService],
})
export class ObservabilityModule {}
