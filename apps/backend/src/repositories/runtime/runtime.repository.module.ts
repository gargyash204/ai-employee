import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuntimeEntity } from './runtime.entity';
import { RuntimeRepository } from './runtime.repository';

@Module({
  imports: [TypeOrmModule.forFeature([RuntimeEntity])],
  providers: [RuntimeRepository],
  exports: [RuntimeRepository],
})
export class RuntimeRepositoryModule {}
