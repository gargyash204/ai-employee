export type LangfuseUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost: number | null;
};

export type LangfuseTracePayload = {
  name: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  model?: string;
  provider?: string;
  prompt?: string;
  instructions?: string;
  latencyMs?: number;
  usage?: LangfuseUsage;
  error?: string | null;
  success: boolean;
};

export type LangfuseTelemetry = {
  traceId: string | null;
  model: string | null;
  provider: string | null;
  latencyMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  cost: number | null;
  prompt: string | null;
  response: string | null;
  input: unknown;
  error: string | null;
  available: boolean;
  langfuseUrl: string | null;
};
