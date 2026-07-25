import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { ExperimentModule } from './modules/experiment/experiment.module';
import { ObservabilityModule } from './modules/observability/observability.module';
import { RuntimeVersionModule } from './modules/runtime-version/runtime-version.module';
import { RuntimeModule } from './modules/runtime/runtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '3306')),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: false,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsTableName: 'migrations',
        migrationsRun: false,
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    AuthModule,
    RuntimeModule,
    RuntimeVersionModule,
    ExperimentModule,
    EvaluationModule,
    ExecutionModule,
    ObservabilityModule,
    HealthModule,
  ],
})
export class AppModule {}
