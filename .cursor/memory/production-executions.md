# Memory: Production Executions

Last updated: 2026-07-26

## Purpose

Publish a Runtime Version and run durable production jobs against the active Published version. Executions advance stage-by-stage, persist checkpoints, pause on failure, and resume without re-running completed steps.

## Data model

### Execution (`executions`)

| Field | Notes |
|-------|--------|
| `id` | UUID PK |
| `runtimeId` | FK → runtimes |
| `runtimeVersionId` | FK → published version used for the job |
| `status` | `Queued` \| `Running` \| `Paused` \| `Completed` \| `Failed` \| `Cancelled` |
| `currentStep` | `ExecutionStep` enum |
| `document` | input text |
| `finalOutput` | nullable JSON (set on SaveOutput) |
| `retryCount` | incremented on resume |
| `startedAt` / `completedAt` | |

### ExecutionCheckpoint (`execution_checkpoints`)

| Field | Notes |
|-------|--------|
| `id` | UUID PK |
| `executionId` | FK, unique with `step` |
| `step` | completed `ExecutionStep` |
| `output` | JSON step result |
| `completedAt` | |

### ExecutionStep

`Queued` → `ReadingDocument` → `ExtractStructuredData` → `GenerateAnswers` → `ValidateResult` → `SaveOutput` → `Completed`

## Key paths

### Backend
- Business: `apps/backend/src/modules/execution/`
  - `execution.controller.ts` — `/executions`
  - `execution.service.ts` — create/list/get/resume/cancel; `scheduleRun` fires orchestrator in-process after HTTP returns
  - `execution.prompts.ts` — production answer prompt + parse
  - `orchestrator/execution.orchestrator.ts` — stage loop, checkpoint, pause
  - `orchestrator/executors/*` — Queued, Reading, Extract, Answer, Validation, Save
- Persistence: `repositories/execution/`, `repositories/execution-checkpoint/`
- Migration: `migrations/1721745000000-CreateExecutionTables.ts`

### Frontend
- Tab: `RuntimeDetails` → Executions
- Page: `components/execution/ExecutionPage.tsx` — queues then polls until settled
- Pieces: `ExecutionForm`, `ExecutionHistory`, `ExecutionCard`, `ExecutionDetails`, `CheckpointTimeline`, `ExecutionStatusBadge`, `ResumeButton`, `CancelButton`
- API: `services/execution.service.ts` — `pollExecution` exponential backoff (1s → 16s cap)
- Poll helpers: `services/execution-poll.ts`
- Check: `services/execution-poll.check.ts`

## APIs

| Method | Path | Notes |
|--------|------|-------|
| POST | `/executions` | `{ runtimeId, document }` → creates `Queued`, returns immediately; run continues in background |
| GET | `/executions?runtimeId=` | History newest first |
| GET | `/executions/:id` | Detail + checkpoints (used for polling) |
| POST | `/executions/:id/resume` | Paused only; marks Running, returns immediately; continues in background |
| POST | `/executions/:id/cancel` | Keeps existing checkpoints |

Auth required. Response shape: `{ success, data, message }`.

## Invariants

- Production never runs Draft versions; requires Published `activeVersionId`.
- Publish (existing `/runtime/:id/publish`) archives previous Published and sets `activeVersionId`.
- Orchestrator skips steps that already have checkpoints.
- AI/step failures → `Paused` (same `currentStep`); resume increments `retryCount`.
- Create/resume HTTP handlers do **not** await the full pipeline; frontend polls `GET /executions/:id` until status leaves `Queued`/`Running`.
- Background runner is in-process (`scheduleRun`); not a durable multi-instance queue.
- Controllers thin; repositories own TypeORM; AI behind `AiProvider` + `LangfuseService`.
- Traces include `executionId` via Langfuse instrumentation (see [observability.md](./observability.md)).

## Errors

| Case | Status |
|------|--------|
| Runtime / execution / published version missing | 404 |
| No active published version / draft attempt | 400 |
| Resume completed / running / cancelled | 400 |
| Cancel completed / already cancelled | 400 |

## Out of scope

- Durable queue workers (BullMQ / separate process) — upgrade when multi-instance
- Semantic validation / LLM-as-judge

## Related

- Observability Dashboard: [observability.md](./observability.md)
- Runtime Versioning: [runtime-versioning.md](./runtime-versioning.md)
- Experiment Studio: [experiment-studio.md](./experiment-studio.md)
- Evaluation Engine: [evaluation-engine.md](./evaluation-engine.md)
