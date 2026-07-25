import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from './ai-provider.interface';
import { AiProviderError } from './ai-provider.error';
import { AiChatMessage, AiCompletionResult } from './ai-provider.types';

type ChatCompletionResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

@Injectable()
export class NvidiaProvider implements AiProvider {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('NVIDIA_API_KEY', '');
    this.baseUrl = this.config
      .get<string>(
        'NVIDIA_API_BASE_URL',
        'https://integrate.api.nvidia.com/v1',
      )
      .replace(/\/$/, '');
    this.model = this.config.get<string>(
      'NVIDIA_MODEL',
      'meta/llama-3.1-70b-instruct',
    );
    this.timeoutMs = Number(
      this.config.get<string>('NVIDIA_TIMEOUT_MS', '60000'),
    );
  }

  async complete(messages: AiChatMessage[]): Promise<AiCompletionResult> {
    if (!this.apiKey) {
      throw new AiProviderError(
        'PROVIDER_FAILURE',
        'NVIDIA_API_KEY is not configured',
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.2,
          max_tokens: 2048,
        }),
        signal: controller.signal,
      });

      if (response.status === 429) {
        throw new AiProviderError(
          'RATE_LIMIT',
          'AI provider rate limit exceeded',
        );
      }

      if (!response.ok) {
        throw new AiProviderError(
          'PROVIDER_FAILURE',
          `AI provider request failed with status ${response.status}`,
        );
      }

      const body = (await response.json()) as ChatCompletionResponse;
      const content = body.choices?.[0]?.message?.content?.trim();

      if (!content) {
        throw new AiProviderError(
          'PROVIDER_FAILURE',
          'AI provider returned an empty response',
        );
      }

      const inputTokens = body.usage?.prompt_tokens ?? null;
      const outputTokens = body.usage?.completion_tokens ?? null;
      const totalTokens =
        body.usage?.total_tokens ??
        (inputTokens !== null && outputTokens !== null
          ? inputTokens + outputTokens
          : null);

      return {
        content,
        model: body.model ?? this.model,
        provider: 'nvidia',
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
        },
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AiProviderError('TIMEOUT', 'AI provider request timed out');
      }

      throw new AiProviderError(
        'PROVIDER_FAILURE',
        'AI provider request failed',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
