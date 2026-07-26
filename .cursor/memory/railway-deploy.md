# Railway deploy + env

## Purpose

One Dockerfile App + Railway MySQL + Langfuse Cloud **US** (`us.cloud.langfuse.com`). Backend TypeORM uses Railway MySQL env names.

## Key paths

- `docker/app.Dockerfile` — combined nginx SPA + Nest image
- `railway.toml` — Dockerfile builder (no watchPatterns)
- `apps/backend/src/app.module.ts` / `database/data-source.ts` — `MYSQLHOST` etc.
- `apps/backend/src/modules/langfuse/langfuse.service.ts` — `LANGFUSE_*` + `getTraceUrl`
- `docs/deploy-railway.md` — setup + GitHub autodeploy checklist
- `.env.example` — local + Railway notes

## APIs

N/A (infra).

## Invariants

- Connection env: `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` (not `DB_*`).
- Compose MySQL **image** init still uses `MYSQL_ROOT_PASSWORD` / `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD`.
- CORS falls back to `https://$RAILWAY_PUBLIC_DOMAIN` when `CORS_ORIGIN` unset.
- Prod Langfuse: `LANGFUSE_BASE_URL` + `LANGFUSE_UI_URL` = `https://us.cloud.langfuse.com`, plus `LANGFUSE_PROJECT_ID` (e.g. `cms0fth8k0cv5ad0g0paxtw4r`).
- Local Langfuse stays on Compose (`localhost:3100` UI); never point Railway at Docker hostnames.
- Autodeploy is a Railway dashboard setting (repo + trigger branch + Autodeploy on; Wait for CI off if no Actions).
- Never commit `.env` or real secrets.

## Out of scope

- Separate Frontend/Backend Railway services
- Self-hosted Langfuse on Railway
- phpMyAdmin on Railway
- `MYSQL_URL` parsing

## Last updated

2026-07-26
