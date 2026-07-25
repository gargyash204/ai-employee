import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationRunEntity } from './evaluation-run.entity';
import { EvaluationRunRepository } from './evaluation-run.repository';

@Module({
  imports: [TypeOrmModule.forFeature([EvaluationRunEntity])],
  providers: [EvaluationRunRepository],
  exports: [EvaluationRunRepository],
})
export class EvaluationRunRepositoryModule {}
