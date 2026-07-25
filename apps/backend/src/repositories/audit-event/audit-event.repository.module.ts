import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditEventEntity } from './audit-event.entity';
import { AuditEventRepository } from './audit-event.repository';

@Module({
  imports: [TypeOrmModule.forFeature([AuditEventEntity])],
  providers: [AuditEventRepository],
  exports: [AuditEventRepository],
})
export class AuditEventRepositoryModule {}
