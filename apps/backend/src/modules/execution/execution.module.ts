import { Module } from '@nestjs/common';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { AuditModule } from '../audit/audit.module';
import { ExecutionCheckpointRepositoryModule } from '../../repositories/execution-checkpoint/execution-checkpoint.repository.module';
import { ExecutionRepositoryModule } from '../../repositories/execution/execution.repository.module';
import { RuntimeRepositoryModule } from '../../repositories/runtime/runtime.repository.module';
import { RuntimeVersionRepositoryModule } from '../../repositories/runtime-version/runtime-version.repository.module';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { ExecutionOrchestrator } from './orchestrator/execution.orchestrator';
import { AnswerExecutor } from './orchestrator/executors/answer.executor';
import { ExtractExecutor } from './orchestrator/executors/extract.executor';
import { QueuedExecutor } from './orchestrator/executors/queued.executor';
import { ReadingDocumentExecutor } from './orchestrator/executors/reading-document.executor';
import { SaveExecutor } from './orchestrator/executors/save.executor';
import { ValidationExecutor } from './orchestrator/executors/validation.executor';

@Module({
  imports: [
    AiProviderModule,
    AuditModule,
    ExecutionRepositoryModule,
    ExecutionCheckpointRepositoryModule,
    RuntimeRepositoryModule,
    RuntimeVersionRepositoryModule,
  ],
  controllers: [ExecutionController],
  providers: [
    ExecutionService,
    ExecutionOrchestrator,
    QueuedExecutor,
    ReadingDocumentExecutor,
    ExtractExecutor,
    AnswerExecutor,
    ValidationExecutor,
    SaveExecutor,
  ],
})
export class ExecutionModule {}
