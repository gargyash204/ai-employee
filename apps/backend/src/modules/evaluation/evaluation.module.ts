import { Module } from '@nestjs/common';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { AuditModule } from '../audit/audit.module';
import { EvaluationCaseRepositoryModule } from '../../repositories/evaluation-case/evaluation-case.repository.module';
import { EvaluationDatasetRepositoryModule } from '../../repositories/evaluation-dataset/evaluation-dataset.repository.module';
import { EvaluationResultRepositoryModule } from '../../repositories/evaluation-result/evaluation-result.repository.module';
import { EvaluationRunRepositoryModule } from '../../repositories/evaluation-run/evaluation-run.repository.module';
import { RuntimeRepositoryModule } from '../../repositories/runtime/runtime.repository.module';
import { RuntimeVersionRepositoryModule } from '../../repositories/runtime-version/runtime-version.repository.module';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';

@Module({
  imports: [
    AiProviderModule,
    AuditModule,
    EvaluationDatasetRepositoryModule,
    EvaluationCaseRepositoryModule,
    EvaluationRunRepositoryModule,
    EvaluationResultRepositoryModule,
    RuntimeRepositoryModule,
    RuntimeVersionRepositoryModule,
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService],
  exports: [EvaluationService],
})
export class EvaluationModule {}
