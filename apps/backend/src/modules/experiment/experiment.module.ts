import { Module } from '@nestjs/common';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { AuditModule } from '../audit/audit.module';
import { ExperimentSessionRepositoryModule } from '../../repositories/experiment-session/experiment-session.repository.module';
import { RuntimeVersionRepositoryModule } from '../../repositories/runtime-version/runtime-version.repository.module';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { ExperimentController } from './experiment.controller';
import { ExperimentService } from './experiment.service';

@Module({
  imports: [
    AiProviderModule,
    AuditModule,
    ExperimentSessionRepositoryModule,
    RuntimeVersionRepositoryModule,
    EvaluationModule,
  ],
  controllers: [ExperimentController],
  providers: [ExperimentService],
})
export class ExperimentModule {}
