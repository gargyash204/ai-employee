# Memory: Runtime

Last updated: 2026-07-25

## Purpose

Business users create and manage named Runtimes (workflows). Selection is URL-driven.

## Key paths

### Backend
- `apps/backend/src/modules/runtime/` — controller, service, dto, types, module (CRUD only)
- Imports `RuntimeVersionModule` so create can call `createInitialDraft`
- `apps/backend/src/repositories/runtime/` — entity, repository, repository module
- Migration: `apps/backend/src/migrations/1721740000000-CreateRuntimesTable.ts`
- Table: `runtimes` (UUID PK, unique `name`, optional `description`, nullable `active_version_id`, timestamps)

### Frontend
- Page: `apps/frontend/src/pages/DashboardPage.tsx` (list + details + dialogs)
- UI: `apps/frontend/src/components/runtime/` (`RuntimeDetails` with Overview/Versions/Dataset Manager/Development Studio/Executions tabs — main pane is full-width `w-full p-8`, no per-tab max-width; sidebar uses `SidebarMenuButton` for New Runtime so icon-collapse stays square)
- API: `apps/frontend/src/services/runtime.service.ts`
- Route: `/dashboard/runtime/:runtimeId`

## APIs

| Method | Path | Notes |
|--------|------|-------|
| POST | `/runtime` | Create (+ Version 1 Draft) |
| GET | `/runtime` | List (newest first) |
| GET | `/runtime/:id` | Get one |
| PATCH | `/runtime/:id` | Update metadata |
| DELETE | `/runtime/:id` | Delete (clears `activeVersionId`, cascades versions) |

All require `@Auth()`. Response shape: `{ success, data, message }`. Includes `activeVersionId`.

## Invariants

- Controllers thin; services hold business logic; repositories own TypeORM.
- Duplicate name → `ConflictException`.
- Frontend never calls Axios in components (services only).
- Runtime stores metadata only; AI config lives on versions.

## Related

- Versioning (instructions Draft/Published/Archived): see [runtime-versioning.md](./runtime-versioning.md)
- Production Executions: see [production-executions.md](./production-executions.md)
