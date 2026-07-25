export type EvaluationDatasetResponse = {
  id: string;
  runtimeId: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export type EvaluationCaseResponse = {
  id: string;
  datasetId: string;
  name: string;
  question: string;
  expectedAnswer: string;
  tags: string[];
  createdAt: string;
};

export type DatasetDetailResponse = {
  dataset: EvaluationDatasetResponse;
  cases: EvaluationCaseResponse[];
};

export type RunEvaluationResponse = {
  evaluationRunId: string;
  score: number;
  passed: number;
  failed: number;
};

export type EvaluationResultResponse = {
  id: string;
  evaluationCaseId: string;
  caseName: string;
  expectedAnswer: string;
  actualAnswer: string | null;
  passed: boolean;
  latency: number;
  error: string | null;
  document: string;
  question: string;
  traceId: string | null;
};

export type EvaluationRunDetailResponse = {
  id: string;
  datasetId: string;
  datasetName: string;
  runtimeVersionId: string;
  runtimeVersionNumber: number | null;
  runtimeVersionStatus: string | null;
  status: string;
  totalTests: number;
  passed: number;
  failed: number;
  score: number;
  document: string | null;
  startedAt: string;
  completedAt: string | null;
  results: EvaluationResultResponse[];
};

export type EvaluationRunSummaryResponse = {
  id: string;
  datasetId: string;
  datasetName: string;
  runtimeVersionId: string;
  runtimeVersionNumber: number | null;
  runtimeVersionStatus: string | null;
  status: string;
  totalTests: number;
  passed: number;
  failed: number;
  score: number;
  startedAt: string;
  completedAt: string | null;
};

export type CompareVersionsResponse = {
  scoreA: number;
  scoreB: number;
  difference: number;
  improvedCases: Array<{
    evaluationCaseId: string;
    caseName: string;
  }>;
  regressedCases: Array<{
    evaluationCaseId: string;
    caseName: string;
  }>;
  runAId: string;
  runBId: string;
};
