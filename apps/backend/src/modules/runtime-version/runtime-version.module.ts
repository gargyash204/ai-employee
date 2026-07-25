import { Module } from '@nestjs/common';
import { RuntimeVersionRepositoryModule } from '../../repositories/runtime-version/runtime-version.repository.module';
import { RuntimeRepositoryModule } from '../../repositories/runtime/runtime.repository.module';
import { AuditModule } from '../audit/audit.module';
import { RuntimeVersionController } from './runtime-version.controller';
import { RuntimeVersionService } from './runtime-version.service';

@Module({
  imports: [
    RuntimeRepositoryModule,
    RuntimeVersionRepositoryModule,
    AuditModule,
  ],
  controllers: [RuntimeVersionController],
  providers: [RuntimeVersionService],
  exports: [RuntimeVersionService],
})
export class RuntimeVersionModule {}
