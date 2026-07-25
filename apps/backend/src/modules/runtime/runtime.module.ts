import { Module } from '@nestjs/common';
import { RuntimeRepositoryModule } from '../../repositories/runtime/runtime.repository.module';
import { AuditModule } from '../audit/audit.module';
import { RuntimeVersionModule } from '../runtime-version/runtime-version.module';
import { RuntimeController } from './runtime.controller';
import { RuntimeService } from './runtime.service';

@Module({
  imports: [RuntimeRepositoryModule, RuntimeVersionModule, AuditModule],
  controllers: [RuntimeController],
  providers: [RuntimeService],
})
export class RuntimeModule {}
