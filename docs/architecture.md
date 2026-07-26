# Architecture

Zamp is a **reliable AI Runtime** platform: users define versioned AI configurations, iterate safely in a studio, govern quality with datasets, run production jobs against a published version, and observe the full lifecycle. The product goal is depth and correctness—not a feature-rich app.

Related: [decisions.md](../decisions.md), [feature memory](../.cursor/memory/README.md), [project rules](../.cursor/rules/project-rules-mdc.mdc).

---

## System overview

```
Browser (React / Vite)
        │  HTTPS + cookie session
        ▼
NestJS API
        │
        ├── Controller → Service → Repository → TypeORM → MySQL
        │
        ├── AiProvider (LLM calls)
        └── LangfuseService (telemetry) ──► Langfuse
```

| Layer | Stack |
|-------|--------|
| Frontend | React, Vite, Axios, React Router, shadcn/ui, Tailwind |
| Backend | NestJS, TypeORM, MySQL 8 |
| AI | Provider abstraction (`AiProvider`); every call instrumented via Langfuse |
| Infra | Docker Compose (frontend, backend, MySQL, phpMyAdmin, Langfuse) |
| Shared | `@zamp/shared` |

Monorepo layout: `apps/backend`, `apps/frontend`, `packages/shared`.

---

## Core domain model

Everything hangs off a **Runtime** (named workflow). AI configuration does **not** live on the Runtime itself—it lives on **Runtime Versions**.

| Concept | Role |
|---------|------|
| **Runtime** | Metadata only (`name`, `description`, `activeVersionId`) |
| **Runtime Version** | Immutable instructions history: `Draft` → `Published` → `Archived` |
| **Dataset / Cases** | Q&A governance (question + expected answer); no document on the case |
| **Experiment session** | Studio run: extract/compare Version A/B; optional link to an evaluation run |
| **Evaluation run** | Regression against a dataset using a **run-time document**; immutable after complete |
| **Execution** | Production job against the **Published** active version; stage checkpoints |
| **Audit event** | Append-only activity feed; may carry a Langfuse `traceId` |

**Version invariants:** at most one Draft and one Published per Runtime. Edit only touches Draft. Publish archives the previous Published version and sets `activeVersionId`. Production never runs Draft.

---

## Backend architecture

### Request path

```
HTTP Request
    → Controller   (DTO validation, auth, thin)
    → Service      (business logic only)
    → Repository   (TypeORM; one entity per repository)
    → MySQL
```

Rules:

- Controllers never access the database or hold business logic.
- Services never contain SQL.
- Repositories own all persistence; prefer TypeORM Repository API over QueryBuilder.
- Every endpoint validates with DTOs; responses are `{ success, data, message }`.
- Backend throws `HttpException`s; frontend surfaces friendly errors.

### Module layout

Business modules live under `apps/backend/src/modules/<feature>/`.  
Persistence lives under `apps/backend/src/repositories/<entity>/` (entity + repository + module). There is no shared entities folder.

| Module | Responsibility |
|--------|----------------|
| `auth` | Session login / logout / me |
| `runtime` | Runtime CRUD; create seeds Version 1 Draft |
| `runtime-version` | Draft get/update, list, publish, get by id |
| `experiment` | Studio extract + optional A/B compare; kicks background regression |
| `evaluation` | Datasets, cases, runs, scoring (`EvaluationService` owns all regression logic) |
| `execution` | Production jobs + orchestrator (checkpointed stages) |
| `observability` | Merge audit events + Langfuse into dashboard DTOs |
| `audit` | Append-only audit writes |
| `langfuse` | Ingest / fetch traces; `instrumentComplete` wraps all AI calls |
| `ai-provider` | LLM provider interface + implementation |

### Production execution pipeline

Stages (checkpointed; resume skips completed steps):

`Queued` → `ReadingDocument` → `ExtractStructuredData` → `GenerateAnswers` → `ValidateResult` → `SaveOutput` → `Completed`

Failures pause at the current step; resume increments `retryCount`.

### Cross-cutting AI / observability

- All AI calls go through `LangfuseService.instrumentComplete` (no bypass).
- Business services do not call Langfuse HTTP directly.
- Audit events are append-only; the Overview dashboard stays usable if Langfuse is down.

---

## Frontend architecture

### Principles

- Intentionally simple: React + `useState` / `useEffect` only (no Redux, Zustand, or React Query).
- **Every** HTTP call goes through `services/*` via the shared Axios client (`lib/api.ts` with `withCredentials`).
- Components stay small; compose feature UIs under `components/<feature>/`.
- Selection is **URL-driven** for runtimes; tabs are local state inside the selected runtime.

### Routes

| Path | What the user sees |
|------|--------------------|
| `/` | Login, or redirect to dashboard if already authenticated |
| `/dashboard` | Shell + empty state (“No Runtime Selected”) |
| `/dashboard/runtime/:runtimeId` | Selected Runtime details + feature tabs |

`App` boots by calling `getMe()`. Unauthenticated users hit `LoginPage`; authenticated users get `ProtectedRoute` → `DashboardPage`.

### Shell

```
App
 └─ DashboardPage          # list + URL-selected runtime; create/edit/delete dialogs
     └─ DashboardLayout    # header + RuntimeSidebar + main pane
         └─ RuntimeDetails # tabs for the selected runtime
```

- **Sidebar:** list of Runtimes; create navigates to the new Runtime’s URL.
- **Main pane:** `RuntimeDetails` for `/dashboard/runtime/:runtimeId`.

### Tabs (inside a Runtime)

Order and jobs:

| Tab | Component | Job |
|-----|-----------|-----|
| Overview | `OverviewPage` | Lifecycle activity + analytics (audit ⊕ Langfuse) |
| Versions | `RuntimeVersions` | Edit Draft instructions; publish |
| Dataset Manager | `EvaluationPage` | Curate Q&A cases; read-only run history / reports |
| Development Studio | `DevelopmentStudioPage` | Paste document; run A/B; optional regression |
| Executions | `ExecutionPage` | Start/resume production jobs |

Tabs are **not** separate routes. Switching Runtime resets to Overview.

### Frontend data flow

```
Component (UI state)
    → services/*.ts (Axios)
    → NestJS API
    → { success, data, message }
    → setState / error message in UI
```

| Concern | Service |
|---------|---------|
| Auth | `auth.service.ts` |
| Runtimes | `runtime.service.ts` |
| Versions | `runtime-version.service.ts` |
| Studio | `experiment.service.ts` |
| Datasets / evals | `evaluation.service.ts` |
| Production | `execution.service.ts` |
| Overview | `observability.service.ts` |

Long-running AI calls use elevated Axios timeouts (e.g. Studio ~90s, Executions ~10m). Studio returns extraction results immediately; regression (when enabled) is polled via evaluation APIs.

---

## End-to-end user flow (frontend perspective)

This is the intended day-to-day loop.

### 1. Sign in

User opens `/` → `LoginPage` → session cookie → `getMe` succeeds → `/dashboard`.

### 2. Create or select a Runtime

- Create from the sidebar → `POST /runtime` → backend also creates **Version 1 Draft** → navigate to `/dashboard/runtime/:id`.
- Or click an existing Runtime in the sidebar (URL updates; details reload).

### 3. Configure instructions (Versions)

Open **Versions** → edit Draft instructions → save. When ready, **Publish** (archives prior Published, sets `activeVersionId`). Published/Archived are read-only in the UI.

### 4. Curate quality bar (Dataset Manager)

Open **Dataset Manager** → pick/create a dataset → add Q&A cases (question + expected answer). This tab does **not** run evaluations; it owns curation and historical reports.

### 5. Iterate (Development Studio)

Open **Development Studio**:

1. Select Version A (and optionally B)—defaults prefer Draft as A and Published as B when both exist.
2. Paste a document.
3. Optionally enable regression against a dataset (same document is used for the eval run).
4. **Run** → immediate A/B (or single) outputs.
5. If regression was started, the panel switches to results-only and can **Open Full Report** → jumps to Dataset Manager with that `initialRunId`.

Studio never owns dataset CRUD; evaluation scoring lives only in `EvaluationService` on the backend.

### 6. Ship to production (Executions)

After a version is Published:

1. Open **Executions** → submit a document.
2. Backend runs against `activeVersionId` through the checkpointed orchestrator.
3. On failure the job **Pauses**; user can **Resume** from the UI (increments retry count, continues from checkpoints).

### 7. Observe (Overview)

**Overview** shows runtime summary, analytics, and an activity feed (Draft Updated, Experiment Run, Regression Started/Completed, Published, Execution). Where a `traceId` exists, **View Trace** opens Langfuse. The frontend never talks to Langfuse directly—only via observability APIs.

---

## Feature ownership map

| User intent | Frontend entry | Backend owner |
|-------------|----------------|---------------|
| Manage workflows | Dashboard sidebar + dialogs | `runtime` |
| Edit / publish AI config | Versions tab | `runtime-version` |
| Compare drafts on a document | Development Studio | `experiment` (+ `evaluation` for regression) |
| Maintain Q&A gold set + reports | Dataset Manager | `evaluation` |
| Run durable production jobs | Executions | `execution` |
| See what happened | Overview | `observability` + `audit` + `langfuse` |

Living detail for agents (APIs, invariants, out-of-scope): `.cursor/memory/*.md`.

---

## Design constraints (deliberate)

- Prefer simplicity over abstraction; fewest files; reuse existing patterns.
- No background job queues (Redis/BullMQ)—Studio regression and production runs are in-process.
- Dataset cases are Q&A only; the document is supplied at run time (Studio / execution).
- Frontend stays free of global client state libraries.
- Scope stays reviewable: depth over breadth; do not add features unless requested.
