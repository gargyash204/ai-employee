import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationResultEntity } from './evaluation-result.entity';
import { EvaluationResultRepository } from './evaluation-result.repository';

@Module({
  imports: [TypeOrmModule.forFeature([EvaluationResultEntity])],
  providers: [EvaluationResultRepository],
  exports: [EvaluationResultRepository],
})
export class EvaluationResultRepositoryModule {}
