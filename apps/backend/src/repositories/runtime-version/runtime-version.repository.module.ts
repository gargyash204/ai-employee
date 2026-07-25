import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuntimeVersionEntity } from './runtime-version.entity';
import { RuntimeVersionRepository } from './runtime-version.repository';

@Module({
  imports: [TypeOrmModule.forFeature([RuntimeVersionEntity])],
  providers: [RuntimeVersionRepository],
  exports: [RuntimeVersionRepository],
})
export class RuntimeVersionRepositoryModule {}
