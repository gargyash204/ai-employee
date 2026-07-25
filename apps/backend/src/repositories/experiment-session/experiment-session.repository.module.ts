import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExperimentSessionEntity } from './experiment-session.entity';
import { ExperimentSessionRepository } from './experiment-session.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ExperimentSessionEntity])],
  providers: [ExperimentSessionRepository],
  exports: [ExperimentSessionRepository],
})
export class ExperimentSessionRepositoryModule {}
