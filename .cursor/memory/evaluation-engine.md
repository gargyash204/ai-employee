# Memory: Evaluation Engine

Last updated: 2026-07-25

## Purpose

Governance layer: datasets (question + expected answer), immutable run history, and detailed reports. Day-to-day regression runs live in Development Studio (which supplies the document); Dataset Manager is for curating Q&A cases and reviewing history.

## Key paths

### Backend
- Business: `apps/backend/src/modules/evaluation/`
  - `answer-comparator.ts` — `SemanticMatchComparator` (LLM-as-judge, 0–10, pass if score > 7); `ExactMatchComparator` kept as alternative
  - `EvaluationService.run` — sync batch (waits for completion; API retained, not used by Dataset Manager UI)
  - `EvaluationService.startBackgroundRun` — create run + fire-and-forget execute (used by Development Studio)
  - Extract once per run from `evaluation_runs.document`, then answer each case question against that extraction
  - Controller `/evaluations`, DTOs, types
- Persistence:
  - `repositories/evaluation-dataset/` — `evaluation_datasets`
  - `repositories/evaluation-case/` — `evaluation_cases` (question, expectedAnswer; no document)
  - `repositories/evaluation-run/` — `evaluation_runs` (nullable `document` for the run input)
  - `repositories/evaluation-result/` — `evaluation_results`
- Migration: `migrations/1721744000000-CreateEvaluationEngineTables.ts`
- Document move: `migrations/1721748000000-MoveDocumentFromCaseToRun.ts`

### Frontend
- Tab order in `RuntimeDetails`: Overview → Versions → **Dataset Manager** → Development Studio → Executions
- Tab id: `dataset-manager`
- Page: `components/evaluation/EvaluationPage.tsx` (accepts optional `initialRunId` from Studio “Open Full Report”)
- Layout: one active dataset selector → Dataset Manager CRUD (Q&A only) → read-only run history (context line + ScoreCard + history + results)
- No version/compare selectors or Run button on this page
- Pieces: `DatasetSelector`, `DatasetManager`, `TestCaseEditor`, `ScoreCard`, `EvaluationHistory`, `EvaluationResultsTable`, `EvaluationResultDrawer`
- Unused by this page but still present: `VersionSelector`, `ComparisonSelector`, `RunEvaluationButton`
- API: `services/evaluation.service.ts`

## APIs

| Method | Path | Notes |
|--------|------|-------|
| POST | `/evaluations/run` | `{ datasetId, runtimeVersionId, document }` → waits → `{ evaluationRunId, score, passed, failed }` |
| GET | `/evaluations/run/:id` | Summary + results (poll while `status === Running`); results include run `document` |
| GET | `/evaluations/runtime/:runtimeId` | History (all datasets) |
| GET | `/evaluations/runtime/:runtimeId/datasets` | List datasets |
| GET | `/evaluations/dataset/:datasetId` | Dataset + cases (Q&A only) |
| POST | `/evaluations/dataset` | Create dataset |
| POST | `/evaluations/case` | Create case (name, question, expectedAnswer, tags) |
| PUT | `/evaluations/case/:id` | Update case |
| DELETE | `/evaluations/case/:id` | Delete case |
| POST | `/evaluations/compare` | Latest completed runs for A/B on dataset → scores + improved/regressed |

Auth required. Response shape: `{ success, data, message }`.

## Invariants

- Controllers thin; services own logic; repositories own TypeORM.
- Single owner of regression logic: `EvaluationService` (Studio calls `startBackgroundRun` with document).
- Case shape is Q&A only; document is run-time input stored on `evaluation_runs`.
- Empty document on run → 400.
- Audit titles: “Regression Started” / “Regression Completed”.
- Runs never mutate after Completed/Failed.
- Version must belong to same runtime as dataset.
- Empty dataset → 400.
- AI errors: timeout 504, rate limit 429, provider failure 502; per-case question failures stored and run continues; extract failure fails the whole run.
- Case pass/fail uses semantic matching: LLM scores meaning 0–10; pass iff score > 7. Exact normalized equality short-circuits to 10 without an LLM call.

## Out of scope

- Per-case documents / multi-document regression suites
- Persisting per-case semantic score in `evaluation_results` / UI
- Async/queued batch runners (Redis/BullMQ)
- Prompt-only gold answers (no question field)
- Run Evaluation button on Dataset Manager (Studio supplies the document)

## Related

- Development Studio: [experiment-studio.md](./experiment-studio.md)
- Observability: [observability.md](./observability.md)
