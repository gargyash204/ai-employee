import type { LangfuseTelemetry } from '../langfuse/langfuse.types';

export type RuntimeSummaryDto = {
  runtimeId: string;
  name: string;
  status: 'Published' | 'Draft' | 'Unpublished';
  publishedVersion: number | null;
  draftVersion: number | null;
  executions: number;
  latestEvaluationScore: number | null;
};

export type ActivityFeedItemDto = {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string | null;
  traceId: string | null;
  langfuseUrl: string | null;
  createdAt: string;
  hasDetails: boolean;
  metadata: Record<string, unknown> | null;
};

export type ObservabilityOverviewDto = {
  summary: RuntimeSummaryDto;
  activity: ActivityFeedItemDto[];
  activityTotal: number;
  statistics: ObservabilitySummaryDto;
};

export type ObservabilitySummaryDto = {
  executions: number;
  experiments: number;
  evaluations: number;
  publishedVersions: number;
  averageLatencyMs: number | null;
  averageTokens: number | null;
  averageCost: number | null;
  executionSuccessRate: number | null;
  evaluationSuccessRate: number | null;
  latestActivityAt: string | null;
};

export type ActivityDetailsDto = {
  activity: ActivityFeedItemDto;
  telemetry: LangfuseTelemetry | null;
  details: Record<string, unknown>;
};
