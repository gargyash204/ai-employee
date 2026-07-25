import { Module } from '@nestjs/common';
import { AuditEventRepositoryModule } from '../../repositories/audit-event/audit-event.repository.module';
import { AuditService } from './audit.service';

@Module({
  imports: [AuditEventRepositoryModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
