# Memory: Runtime Versioning

Last updated: 2026-07-23

## Purpose

Immutable version history for Runtime AI configuration (instructions). Business users edit a Draft, then Publish. Future Playground / Evaluation / Production / Langfuse must reference a Runtime Version, not the Runtime alone.

## Data model

### Runtime (`runtimes`) — metadata only

| Field | Notes |
|-------|--------|
| `id` | UUID PK |
| `name` | unique |
| `description` | optional |
| `activeVersionId` | nullable FK → currently Published version |
| `createdAt` / `updatedAt` | |

### RuntimeVersion (`runtime_versions`)

| Field | Notes |
|-------|--------|
| `id` | UUID PK |
| `runtimeId` | FK, `ON DELETE CASCADE` |
| `version` | int, unique per runtime |
| `instructions` | text |
| `status` | enum: `Draft` \| `Published` \| `Archived` |
| `createdAt` / `updatedAt` | |

Invariants: at most one Draft; at most one Published; Archived is immutable.

## Key paths

### Backend
- Business: `apps/backend/src/modules/runtime-version/`
  - `runtime-version.controller.ts` — version HTTP endpoints (`@Controller('runtime')`)
  - `runtime-version.service.ts` — list, get/update draft, publish, get by id, `createInitialDraft`
  - `runtime-version.dto.ts` — `UpdateDraftDto`
  - `runtime-version.types.ts`
  - `runtime-version.module.ts` — exports `RuntimeVersionService` for Runtime create
- Persistence: `apps/backend/src/repositories/runtime-version/`
- Migration: `apps/backend/src/migrations/1721742000000-CreateRuntimeVersionsAndMigrate.ts`
  - Adds `runtime_versions` + `runtimes.active_version_id`
  - Migrates prior `runtime_configurations.instructions` into Version 1 Draft
  - Drops `runtime_configurations`

### Frontend
- `RuntimeDetails.tsx` — tabs: General \| Versions
- `RuntimeVersions.tsx`, `VersionCard.tsx`, `VersionDetail.tsx`, `VersionStatusBadge.tsx`
- API: `apps/frontend/src/services/runtime-version.service.ts`

## APIs

| Method | Path | Notes |
|--------|------|-------|
| GET | `/runtime/:runtimeId/versions` | Newest first |
| GET | `/runtime/:runtimeId/draft` | Current Draft; 404 if none |
| PUT | `/runtime/:runtimeId/draft` | Update Draft; auto-create from next version if none |
| POST | `/runtime/:runtimeId/publish` | Archive current Published; publish Draft; set `activeVersionId` |
| GET | `/runtime/version/:versionId` | Single version |

Auth required. Response shape: `{ success, data, message }`.

Static / nested paths live on `RuntimeVersionController` so they do not collide with Runtime CRUD `:id`.

## Business rules

- Create Runtime → auto-create Version 1 `Draft` (empty instructions) via `RuntimeVersionService.createInitialDraft`.
- Edit only touches Draft. If no Draft: create `max(version)+1` as Draft (UI “Create Draft” copies Published instructions via PUT).
- Publish: require Draft; archive Published if any; mark Draft Published; set `activeVersionId`; no Draft left.
- Published / Archived: read-only in UI.

## Errors

| Case | Status |
|------|--------|
| Runtime / version / draft missing | 404 |
| Publish without Draft | 400 |
| Multiple Draft or Published | 409 |

## Out of scope

Questions (removed with configuration), Langfuse UI, rollback UI.

## Related

- Experiment Studio (Playground): see [experiment-studio.md](./experiment-studio.md)
- Evaluation Engine: see [evaluation-engine.md](./evaluation-engine.md)
- Production Executions: see [production-executions.md](./production-executions.md)

## Supersedes

[runtime-configuration.md](./runtime-configuration.md) — configuration table/API/UI removed; instructions live on versions only.
