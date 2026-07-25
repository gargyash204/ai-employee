import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationDatasetEntity } from './evaluation-dataset.entity';
import { EvaluationDatasetRepository } from './evaluation-dataset.repository';

@Module({
  imports: [TypeOrmModule.forFeature([EvaluationDatasetEntity])],
  providers: [EvaluationDatasetRepository],
  exports: [EvaluationDatasetRepository],
})
export class EvaluationDatasetRepositoryModule {}
