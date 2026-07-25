# Memory: Development Studio (formerly Experiment Studio)

Last updated: 2026-07-25

## Purpose

Unified place to iterate on AI versions: paste a document, compare Version A/B outputs immediately, optionally kick off regression against a Q&A dataset using that same document. Results-only after run — no dataset curation or ad-hoc Q&A save in Studio.

## Key paths

### Backend
- Business: `apps/backend/src/modules/experiment/`
  - `ExperimentService.run` — extraction + optional background regression via `EvaluationService.startBackgroundRun({ ..., document })`
  - Prompts: `experiment.prompts.ts`
- Persistence: `repositories/experiment-session/` — `experiment_sessions`
  - Nullable `evaluation_run_id` (FK → `evaluation_runs`)
- Migration: `migrations/1721747000000-AddExperimentSessionEvaluationRunId.ts`

### Frontend
- Tab: `RuntimeDetails` → **Development Studio**
- Page: `components/experiment/ExperimentPage.tsx` (`DevelopmentStudioPage`)
- Pieces: `VersionSelector`, `ComparisonToggle`, `DocumentEditor`, `RunButton`, `ComparisonView`, `RegressionPanel`
- API: `services/experiment.service.ts` (90s timeout for AI; regression polled via evaluation APIs)

## APIs

| Method | Path | Notes |
|--------|------|-------|
| POST | `/experiment/run` | `{ versionAId, versionBId?, document, runEvaluation?, datasetId? }` → session + outputs + optional `{ evaluationRunId, evaluationStatus: "Running" }` |
| GET | `/experiment/session/:id` | Stored session (includes `evaluationRunId`) |

Auth required. Response shape: `{ success, data, message }`.

Removed: `POST /experiment/question`, `POST /experiment/save-evaluation`.

## Invariants

- Experiment returns outputs **before** regression finishes; eval runs in-process via `startBackgroundRun` (no queue) and uses the **same Studio document**.
- Evaluation logic lives only in `EvaluationService` — experiment never duplicates scoring.
- Default UI selection: Draft as A, Published as B when both exist; else Draft only.
- Regression checkbox defaults on when Default dataset has cases; disabled when dataset empty.
- Before run: RegressionPanel shows dataset selector + checkbox. After `evaluationRunId`: setup hidden; scores / Open Full Report only.
- “Open Full Report” navigates to Dataset Manager tab with `initialRunId`.
- Version A/B must belong to the same runtime; B optional.
- Empty document → 400.
- AI errors: timeout 504, rate limit 429, provider failure 502.
- Dataset case CRUD lives only in Dataset Manager.

## Out of scope

- Background queues / Redis / BullMQ
- Ad-hoc question probe / save test case from Studio
- Multi-document regression

## Related

- Evaluation Engine (governance / reports): [evaluation-engine.md](./evaluation-engine.md)
- Observability Dashboard: [observability.md](./observability.md)
