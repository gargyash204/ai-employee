# Memory: Production Executions

Last updated: 2026-08-01

## Purpose


Publish a Runtime Version and run durable production jobs against the active Published version. Executions accept a **PDF upload**, extract text (embedded → OCR fallback), then advance stage-by-stage with checkpoints, pause on failure, and resume without re-running completed steps.

## Data model

### Execution (`executions`)

| Field | Notes |
|-------|--------|
| `id` | UUID PK |
| `runtimeId` | FK → runtimes |
| `runtimeVersionId` | FK → published version used for the job |
| `status` | `Queued` \| `Running` \| `Paused` \| `Completed` \| `Failed` |
| `currentStep` | `ExecutionStep` enum (includes `ParsingDocument`) |
| `document` | extracted input text (empty until parse succeeds) |
| `tempFilePath` | nullable path to temp PDF until parse succeeds |
| `parserError` | nullable user-facing parse/OCR error |
| `finalOutput` | nullable JSON (set on SaveOutput) |
| `retryCount` | incremented on resume |
| `startedAt` / `completedAt` | |

### ExecutionCheckpoint (`execution_checkpoints`)

| Field | Notes |
|-------|--------|
| `id` | UUID PK |
| `executionId` | FK, unique with `step` |
| `step` | completed `ExecutionStep` (incl. `ParsingDocument`) |
| `output` | JSON step result |
| `completedAt` | |

### ExecutionStep

`ParsingDocument` → `Queued` → `ReadingDocument` → `ExtractStructuredData` → `GenerateAnswers` → `ValidateResult` → `SaveOutput` → `Completed`

Parsing runs **outside** the AI orchestrator; Runtime only ever sees extracted text in `document`.

## Key paths

### Backend
- Business: `apps/backend/src/modules/execution/`
  - `execution.controller.ts` — multipart `POST /executions`
  - `execution.service.ts` — createFromUpload / parseThenRun / resume; `scheduleParseAndRun` then orchestrator
  - `orchestrator/*` — AI pipeline (text only); extract/answers use `json: true`
  - Extraction normalize: `experiment.prompts.ts` `parseExtractionResponse` (preferred `{summary,structuredData}` or any JSON object/array)
- AI: `nvidia.provider.ts` sends `response_format: { type: "json_object" }` when `json: true`
- Parser: `apps/backend/src/modules/document-parser/`
  - `ParserStrategy` + `PdfParserStrategy` (embedded text → Tesseract OCR)
  - `TempFileService` — local temp files + abandoned cleanup
- Persistence: `repositories/execution/`, `repositories/execution-checkpoint/`
- Migrations: `1721745000000-CreateExecutionTables.ts`, `1721749000000-AddExecutionPdfParsingFields.ts`
- Docker: `tesseract-ocr`, `tesseract-ocr-data-eng`, `poppler-utils` in `docker/backend.Dockerfile` + `docker/app.Dockerfile`

### Frontend
- Tab: `RuntimeDetails` → Executions
- Page: `components/execution/ExecutionPage.tsx` — upload then polls until settled
- Pieces: `ExecutionForm` (PDF), `ExecutionHistory`, `ExecutionCard`, `ExecutionDetails` (+ `parserError`), `CheckpointTimeline`, `ResumeButton`
- API: `services/execution.service.ts` — FormData create; `pollExecution` unchanged
- Validation: `components/execution/pdf-upload.ts` (PDF only, 1 file, ≤ 2 MB)

## APIs

| Method | Path | Notes |
|--------|------|-------|
| POST | `/executions` | multipart: `file`, `runtimeId`, optional `versionId` (must match active Published). Creates `ParsingDocument`, returns immediately |
| GET | `/executions?runtimeId=` | History newest first |
| GET | `/executions/:id` | Detail + checkpoints + `parserError` (polling) |
| POST | `/executions/:id/resume` | Paused only; same execution — re-parse if still on `ParsingDocument`, else continue AI |

Auth required. Response shape: `{ success, data, message }`.

## Invariants

- Production never runs Draft versions; requires Published `activeVersionId`.
- Max PDF size **2 MB** (frontend + backend); magic-byte + encrypt checks on backend.
- Temp PDF kept on parse failure for retry; deleted only after successful parse. Abandoned temps cleaned hourly (24h TTL).
- OCR (Tesseract eng) only when embedded text is not meaningful; not every PDF.
- Orchestrator skips steps that already have checkpoints; never sees PDF bytes.
- Extract/answers request JSON mode from the provider; parser accepts broad JSON shapes (not only the preferred schema).
- AI/step or parse failures → `Paused` (retry via Resume). Missing temp on retry → `Failed`.
- On AI step failure, orchestrator writes `ExecutionPaused` audit **with Langfuse `traceId`** so Overview shows View Trace even when no checkpoint was created.
- Create/resume HTTP handlers do **not** await the full pipeline; frontend polls until status leaves `Queued`/`Running`.
- Background runner is in-process (`scheduleParseAndRun` / `scheduleRun`); not a durable multi-instance queue.
- Legacy text-paste create API removed; historical executions without `ParsingDocument` still render (timeline hides that step).

## Errors

| Case | Status |
|------|--------|
| Runtime / execution / published version missing | 404 |
| No active published version / draft / wrong versionId | 400 |
| Invalid/empty/oversized/encrypted/non-PDF | 400 |
| Parse/OCR failure | Paused + `parserError` |
| Temp missing on parse retry | Failed + `parserError` |
| Resume completed / running / failed / not paused | 400 |

## Out of scope

- S3 / object storage / long-term PDF retention
- DOCX, images, Excel, multi-language OCR, handwriting, tables/diagrams
- Cancel execution
- Durable queue workers
- Semantic validation / LLM-as-judge

## Related

- Observability Dashboard: [observability.md](./observability.md)
- Runtime Versioning: [runtime-versioning.md](./runtime-versioning.md)
- Experiment Studio: [experiment-studio.md](./experiment-studio.md) (still paste-text)
- Evaluation Engine: [evaluation-engine.md](./evaluation-engine.md)
