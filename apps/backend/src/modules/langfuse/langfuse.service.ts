import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { AiProvider } from '../ai-provider/ai-provider.interface';
import type {
  AiChatMessage,
  AiCompletionResult,
} from '../ai-provider/ai-provider.types';
import {
  LangfuseTelemetry,
  LangfuseTracePayload,
  LangfuseUsage,
} from './langfuse.types';

export type InstrumentedAiResult = {
  completion: AiCompletionResult;
  traceId: string | null;
  latencyMs: number;
};

type IngestionEvent = {
  id: string;
  type: 'trace-create' | 'generation-create';
  timestamp: string;
  body: Record<string, unknown>;
};

@Injectable()
export class LangfuseService {
  private readonly logger = new Logger(LangfuseService.name);
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly uiUrl: string;
  private readonly projectId: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    this.publicKey = this.config.get<string>('LANGFUSE_PUBLIC_KEY', '');
    this.secretKey = this.config.get<string>('LANGFUSE_SECRET_KEY', '');
    this.baseUrl = this.config
      .get<string>('LANGFUSE_BASE_URL', 'http://localhost:3100')
      .replace(/\/$/, '');
    this.uiUrl = this.config
      .get<string>('LANGFUSE_UI_URL', this.baseUrl)
      .replace(/\/$/, '');
    this.projectId =
      this.config.get<string>('LANGFUSE_PROJECT_ID', '') ||
      this.config.get<string>('LANGFUSE_INIT_PROJECT_ID', 'zamp-project');
    this.enabled = Boolean(this.publicKey && this.secretKey);
  }

  isConfigured(): boolean {
    return this.enabled;
  }

  getTraceUrl(traceId: string): string {
    return `${this.uiUrl}/project/${this.projectId}/traces/${traceId}`;
  }

  /**
   * Runs an AI completion and always records a Langfuse Trace.
   * Instrumentation lives here so business modules never call Langfuse directly.
   */
  async instrumentComplete(
    aiProvider: AiProvider,
    input: {
      name: string;
      messages: AiChatMessage[];
      metadata?: Record<string, unknown>;
      instructions?: string;
      document?: string;
      question?: string;
      /** When true, request JSON object mode from the provider. */
      json?: boolean;
    },
  ): Promise<InstrumentedAiResult> {
    const prompt = input.messages
      .map((message) => `${message.role}: ${message.content}`)
      .join('\n\n');
    const startedAt = Date.now();

    try {
      const completion = await aiProvider.complete(input.messages, {
        json: input.json,
      });
      const latencyMs = Date.now() - startedAt;
      const traceId = await this.recordGeneration({
        name: input.name,
        input: {
          document: input.document ?? null,
          question: input.question ?? null,
          messages: input.messages,
        },
        output: completion.content,
        prompt,
        instructions: input.instructions,
        model: completion.model,
        provider: completion.provider,
        latencyMs,
        usage: {
          inputTokens: completion.usage.inputTokens,
          outputTokens: completion.usage.outputTokens,
          totalTokens: completion.usage.totalTokens,
          cost: null,
        },
        metadata: input.metadata ?? {},
        success: true,
        error: null,
      });

      return { completion, traceId, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await this.recordGeneration({
        name: input.name,
        input: {
          document: input.document ?? null,
          question: input.question ?? null,
          messages: input.messages,
        },
        output: null,
        prompt,
        instructions: input.instructions,
        model: this.config.get<string>(
          'NVIDIA_MODEL',
          'meta/llama-3.1-70b-instruct',
        ),
        provider: 'nvidia',
        latencyMs,
        metadata: input.metadata ?? {},
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Records one AI generation as a Langfuse Trace + Generation.
   * Never throws — observability must not break AI flows.
   */
  async recordGeneration(
    payload: LangfuseTracePayload,
  ): Promise<string | null> {
    if (!this.enabled) {
      this.logger.warn('Langfuse is not configured; skipping trace');
      return null;
    }

    const traceId = randomUUID();
    const generationId = randomUUID();
    const now = new Date().toISOString();
    const end = new Date().toISOString();
    const start = new Date(
      Date.now() - (payload.latencyMs ?? 0),
    ).toISOString();

    const usage = this.toLangfuseUsage(payload.usage);
    const events: IngestionEvent[] = [
      {
        id: randomUUID(),
        type: 'trace-create',
        timestamp: now,
        body: {
          id: traceId,
          name: payload.name,
          input: payload.input ?? null,
          output: payload.output ?? null,
          metadata: {
            ...(payload.metadata ?? {}),
            provider: payload.provider ?? null,
            instructions: payload.instructions ?? null,
            finalPrompt: payload.prompt ?? null,
            success: payload.success,
            error: payload.error ?? null,
          },
        },
      },
      {
        id: randomUUID(),
        type: 'generation-create',
        timestamp: now,
        body: {
          id: generationId,
          traceId,
          name: payload.name,
          model: payload.model ?? null,
          input: payload.input ?? payload.prompt ?? null,
          output: payload.output ?? null,
          startTime: start,
          endTime: end,
          level: payload.success ? 'DEFAULT' : 'ERROR',
          statusMessage: payload.error ?? null,
          metadata: {
            provider: payload.provider ?? null,
            latencyMs: payload.latencyMs ?? null,
          },
          ...(usage ? { usage } : {}),
        },
      },
    ];

    try {
      const response = await fetch(`${this.baseUrl}/api/public/ingestion`, {
        method: 'POST',
        headers: {
          Authorization: this.basicAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batch: events }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        this.logger.warn(
          `Langfuse ingestion failed with status ${response.status}`,
        );
        return null;
      }

      return traceId;
    } catch (error) {
      this.logger.warn(
        `Langfuse unavailable: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      return null;
    }
  }

  async getTelemetry(traceId: string): Promise<LangfuseTelemetry> {
    const empty: LangfuseTelemetry = {
      traceId,
      model: null,
      provider: null,
      latencyMs: null,
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      cost: null,
      prompt: null,
      response: null,
      input: null,
      error: null,
      available: false,
      langfuseUrl: this.enabled ? this.getTraceUrl(traceId) : null,
    };

    if (!this.enabled) {
      return empty;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/public/traces/${encodeURIComponent(traceId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: this.basicAuthHeader(),
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(5000),
        },
      );

      if (response.status === 404) {
        return { ...empty, error: 'Trace not found' };
      }

      if (!response.ok) {
        return {
          ...empty,
          error: `Telemetry fetch failed (${response.status})`,
        };
      }

      const body = (await response.json()) as Record<string, unknown>;
      const metadata =
        body.metadata && typeof body.metadata === 'object'
          ? (body.metadata as Record<string, unknown>)
          : {};
      const observations = Array.isArray(body.observations)
        ? (body.observations as Array<Record<string, unknown>>)
        : [];
      const generation =
        observations.find((item) => item.type === 'GENERATION') ??
        observations[0] ??
        null;

      const usage =
        generation?.usage && typeof generation.usage === 'object'
          ? (generation.usage as Record<string, unknown>)
          : {};

      const inputTokens = this.asNumber(
        usage.input ?? usage.promptTokens ?? usage.inputTokens,
      );
      const outputTokens = this.asNumber(
        usage.output ?? usage.completionTokens ?? usage.outputTokens,
      );
      const totalTokens =
        this.asNumber(usage.total ?? usage.totalTokens) ??
        (inputTokens !== null && outputTokens !== null
          ? inputTokens + outputTokens
          : null);

      const latencyMs =
        this.asNumber(generation?.latency) ??
        this.asNumber(metadata.latencyMs) ??
        this.computeLatencyMs(generation);

      return {
        traceId,
        model: this.asString(generation?.model) ?? this.asString(body.model),
        provider:
          this.asString(metadata.provider) ??
          this.asString(
            generation?.metadata &&
              typeof generation.metadata === 'object'
              ? (generation.metadata as Record<string, unknown>).provider
              : null,
          ),
        latencyMs,
        inputTokens,
        outputTokens,
        totalTokens,
        cost: this.asNumber(
          usage.totalCost ??
            (generation?.calculatedTotalCost as number | undefined),
        ),
        prompt:
          this.asString(metadata.finalPrompt) ??
          this.stringifyMaybe(generation?.input ?? body.input),
        response: this.stringifyMaybe(generation?.output ?? body.output),
        input: body.input ?? generation?.input ?? null,
        error:
          this.asString(metadata.error) ??
          this.asString(generation?.statusMessage),
        available: true,
        langfuseUrl: this.getTraceUrl(traceId),
      };
    } catch (error) {
      return {
        ...empty,
        error:
          error instanceof Error
            ? `Langfuse unavailable: ${error.message}`
            : 'Langfuse unavailable',
      };
    }
  }

  private basicAuthHeader(): string {
    const token = Buffer.from(
      `${this.publicKey}:${this.secretKey}`,
      'utf8',
    ).toString('base64');
    return `Basic ${token}`;
  }

  private toLangfuseUsage(
    usage?: LangfuseUsage,
  ): Record<string, number> | null {
    if (!usage) {
      return null;
    }

    const body: Record<string, number> = {};
    if (usage.inputTokens !== null) {
      body.input = usage.inputTokens;
    }
    if (usage.outputTokens !== null) {
      body.output = usage.outputTokens;
    }
    if (usage.totalTokens !== null) {
      body.total = usage.totalTokens;
    }
    if (usage.cost !== null) {
      body.totalCost = usage.cost;
    }

    return Object.keys(body).length > 0 ? body : null;
  }

  private asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }

  private asString(value: unknown): string | null {
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    return null;
  }

  private stringifyMaybe(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private computeLatencyMs(
    generation: Record<string, unknown> | null,
  ): number | null {
    if (!generation) {
      return null;
    }
    const start = this.asString(generation.startTime);
    const end = this.asString(generation.endTime);
    if (!start || !end) {
      return null;
    }
    const startMs = Date.parse(start);
    const endMs = Date.parse(end);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      return null;
    }
    return Math.max(0, endMs - startMs);
  }
}
