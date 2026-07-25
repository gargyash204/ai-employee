import { Module } from '@nestjs/common';
import { LangfuseModule } from '../langfuse/langfuse.module';
import { AI_PROVIDER } from './ai-provider.interface';
import { NvidiaProvider } from './nvidia.provider';

@Module({
  imports: [LangfuseModule],
  providers: [
    NvidiaProvider,
    {
      provide: AI_PROVIDER,
      useExisting: NvidiaProvider,
    },
  ],
  exports: [AI_PROVIDER, LangfuseModule],
})
export class AiProviderModule {}
