import { AiProviderErrorCode } from './ai-provider.types';

export class AiProviderError extends Error {
  readonly code: AiProviderErrorCode;
  readonly traceId: string | null;
  readonly response: string | null;

  constructor(
    code: AiProviderErrorCode,
    message: string,
    options?: { traceId?: string | null; response?: string | null },
  ) {
    super(message);
    this.name = 'AiProviderError';
    this.code = code;
    this.traceId = options?.traceId ?? null;
    this.response = options?.response ?? null;
  }
}
