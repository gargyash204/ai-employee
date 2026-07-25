import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionEntity } from './execution.entity';
import { ExecutionRepository } from './execution.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ExecutionEntity])],
  providers: [ExecutionRepository],
  exports: [ExecutionRepository],
})
export class ExecutionRepositoryModule {}
