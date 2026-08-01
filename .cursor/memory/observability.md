# Memory: AI Observability Dashboard

Last updated: 2026-07-30

## Purpose

Integrated operational dashboard for a Runtime’s full AI lifecycle. Langfuse is the telemetry backend; the app stores immutable Audit Events in MySQL and merges both into Overview / Activity Details. Frontend never talks to Langfuse directly.

## Activity timeline titles

Expected lifecycle labels in the feed:

| Event | Title |
|-------|--------|
| Draft instructions saved | Draft Updated |
| Experiment finished | Experiment Run |
| Eval kicked off (from Studio or Reports) | Regression Started |
| Eval finished | Regression Completed |
| Version published | Published |
| Production run finished | Execution |

When `traceId` is present, the feed shows **View Trace** (opens Langfuse via `langfuseUrl`). This includes **Execution Paused** after an AI step failure (invalid JSON, provider error) — the orchestrator records the pause audit with the Langfuse `traceId` from the failed call.

## Data model

### AuditEvent (`audit_events`)

| Field | Notes |
|-------|--------|
| `id` | UUID PK |
| `runtimeId` | FK → runtimes |
| `eventType` | e.g. ExperimentCompleted, EvaluationCompleted, ExecutionCompleted, RuntimePublished |
| `entityType` / `entityId` | Linked business entity |
| `title` / `description` | Feed copy |
| `traceId` | Nullable Langfuse trace id |
| `metadata` | JSON (prompts, scores, tokens, etc.) |
| `createdAt` | Immutable |

### EvaluationResult

- Added nullable `traceId` for per-test-case Langfuse links.

## Key paths

### Backend
- Langfuse: `modules/langfuse/` — HTTP ingestion + fetch (`LangfuseService.instrumentComplete`)
- Audit: `modules/audit/` + `repositories/audit-event/`
- Observability: `modules/observability/` — merge audit + telemetry DTOs; activity items include `langfuseUrl`
- Migration: `migrations/1721746000000-CreateAuditEventsAndTraceIds.ts`
- Docker: `docker/langfuse.compose.yml` included from root `docker-compose.yml` (UI `:3100`)

### Frontend
- Tab: `RuntimeDetails` → **Overview**
- Page: `components/observability/OverviewPage.tsx`
- Pieces: RuntimeSummaryCard, AnalyticsCard, ActivityFeed, ActivityCard (View Trace + View Details), ActivityDetailsModal, Experiment/Evaluation/ExecutionDetails, CheckpointTimeline, TokenMetrics, Prompt/Response viewers, CollapsibleSection
- API: `services/observability.service.ts`

## APIs

| Method | Path | Notes |
|--------|------|--------|
| GET | `/observability/runtime/:runtimeId` | Summary + activity (paginated) + statistics |
| GET | `/observability/activity/:activityId` | Merged audit + Langfuse details |
| GET | `/observability/summary/:runtimeId` | Analytics metrics |

Auth required. Response shape: `{ success, data, message }`.

## Env

| Env | Local (Docker Compose) | Prod (Railway) |
|-----|------------------------|----------------|
| `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` | Compose init defaults | Langfuse Cloud US project keys |
| `LANGFUSE_BASE_URL` | `http://langfuse-web:3000` (backend→API) | `https://us.cloud.langfuse.com` |
| `LANGFUSE_UI_URL` | `http://localhost:3100` (browser links) | `https://us.cloud.langfuse.com` |
| `LANGFUSE_PROJECT_ID` | `zamp-project` (or `LANGFUSE_INIT_PROJECT_ID`) | Cloud project id from `/project/<id>/…` |

`getTraceUrl` builds: `{LANGFUSE_UI_URL}/project/{LANGFUSE_PROJECT_ID}/traces/{traceId}` (not `/trace/{id}`).

Ingestion is sync HTTP to `{BASE_URL}/api/public/ingestion` (5s timeout). UI may lag briefly after ingest; wrong region host or missing `PROJECT_ID` produces broken Overview links even when traces exist.

## Invariants

- Every AI call goes through `LangfuseService.instrumentComplete` (no bypass).
- Business services never call Langfuse HTTP directly.
- Audit events are append-only.
- Dashboard remains usable if Langfuse is down (missing telemetry shown gracefully).
- Controllers thin; repositories own TypeORM.

## Out of scope

- Recreating Langfuse UI
- Semantic LLM-as-judge scoring
- Async workers for ingestion

## Related

- Development Studio, Evaluation Engine, Production Executions memories
