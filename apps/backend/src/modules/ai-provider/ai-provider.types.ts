export type AiOperation = 'extract' | 'question';

export type AiChatRole = 'system' | 'user' | 'assistant';

export type AiChatMessage = {
  role: AiChatRole;
  content: string;
};

export type AiUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type AiCompletionResult = {
  content: string;
  model: string;
  provider: string;
  usage: AiUsage;
};

export type AiTraceContext = {
  runtimeId: string;
  runtimeVersionId: string;
  experimentSessionId?: string;
  evaluationRunId?: string;
  datasetId?: string;
  executionId?: string;
  operation: AiOperation;
};

export type AiProviderErrorCode =
  | 'TIMEOUT'
  | 'RATE_LIMIT'
  | 'PROVIDER_FAILURE';
