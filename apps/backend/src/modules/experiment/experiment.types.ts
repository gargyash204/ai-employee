export type ExperimentVersionResult = {
  summary: string;
  structuredData: Record<string, unknown>;
};

export type RunExperimentResponse = {
  sessionId: string;
  versionA: ExperimentVersionResult;
  versionB: ExperimentVersionResult | null;
  evaluationRunId: string | null;
  evaluationStatus: string | null;
};

export type ExperimentSessionResponse = {
  id: string;
  runtimeId: string;
  versionAId: string;
  versionBId: string | null;
  document: string;
  extractionA: Record<string, unknown>;
  extractionB: Record<string, unknown> | null;
  summaryA: string;
  summaryB: string | null;
  evaluationRunId: string | null;
  createdAt: string;
};
