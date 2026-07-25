import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExecutionCheckpointEntity } from './execution-checkpoint.entity';
import { ExecutionCheckpointRepository } from './execution-checkpoint.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ExecutionCheckpointEntity])],
  providers: [ExecutionCheckpointRepository],
  exports: [ExecutionCheckpointRepository],
})
export class ExecutionCheckpointRepositoryModule {}
