import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationCaseEntity } from './evaluation-case.entity';
import { EvaluationCaseRepository } from './evaluation-case.repository';

@Module({
  imports: [TypeOrmModule.forFeature([EvaluationCaseEntity])],
  providers: [EvaluationCaseRepository],
  exports: [EvaluationCaseRepository],
})
export class EvaluationCaseRepositoryModule {}
