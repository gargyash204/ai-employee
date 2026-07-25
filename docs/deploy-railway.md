# Deploy to Railway (demo)

Minimal stoppable demo: **one app container** (nginx SPA + Nest API) + **Railway MySQL** + **Langfuse Cloud** for observability.

Self-hosted Langfuse and phpMyAdmin stay local-only (Compose). Do not put secrets in git.

## Architecture

```
Browser → Railway App (nginx + Nest)
                ↓
         Railway MySQL
                ↓
         Langfuse Cloud  ← “View Trace” opens here
                ↓
         NVIDIA API
```

## 1. Langfuse Cloud

1. Create an account at [cloud.langfuse.com](https://cloud.langfuse.com).
2. Create a project and copy the **public** and **secret** API keys.
3. You will set these as Railway variables (`LANGFUSE_*` below).

## 2. Push to GitHub

This repo must be on GitHub for Railway’s GitHub deploy.

```bash
# From repo root — only when you are ready to commit
git add -A
git status   # confirm .env is NOT listed
git commit -m "Initial commit for Railway demo"
# Create a GitHub repo, then:
git remote add origin git@github.com:<you>/<repo>.git
git push -u origin HEAD
```

Never commit `.env` (it is gitignored).

## 3. Railway project

1. Open [railway.app](https://railway.app) → **New Project**.
2. **Deploy from GitHub repo** → select this repository.
3. Railway should pick up [`railway.toml`](../railway.toml) and build [`docker/app.Dockerfile`](../docker/app.Dockerfile).
4. **+ New** → **Database** → **MySQL**.
5. On the **App** service → **Settings** → **Networking** → **Generate Domain**.

Rename services in the canvas if you like (e.g. `App`, `MySQL`) so variable references match the table below.

## 4. Environment variables (App service only)

Open the App service → **Variables**. Paste via Raw Editor or add one-by-one.

Use Railway [reference variables](https://docs.railway.com/guides/variables#referencing-another-services-variable) for MySQL. If your MySQL service is named differently, change `MySQL` in the `${{…}}` references.

```bash
NODE_ENV=production

# MySQL (reference the managed MySQL service — adjust service name if needed)
DB_HOST=${{MySQL.MYSQLHOST}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_USERNAME=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_DATABASE=${{MySQL.MYSQLDATABASE}}

# Auth — use strong unique values for the demo
APP_USERNAME=
APP_PASSWORD=
COOKIE_SECRET=

# Same-origin SPA + API (public HTTPS URL Railway assigned)
CORS_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}

# NVIDIA
NVIDIA_API_KEY=
NVIDIA_API_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-70b-instruct
NVIDIA_TIMEOUT_MS=60000

# Langfuse Cloud (not the local Compose stack)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_BASE_URL=https://cloud.langfuse.com
LANGFUSE_UI_URL=https://cloud.langfuse.com
```

Generate secrets locally (do not commit the output):

```bash
openssl rand -base64 32   # COOKIE_SECRET
openssl rand -base64 18   # APP_PASSWORD candidate
```

If MySQL reference names differ in your project, open the MySQL service → **Variables** and copy the exact keys Railway shows (`MYSQLHOST`, etc.).

Redeploy after saving variables.

## 5. Smoke test

1. Open the App public URL → login with `APP_USERNAME` / `APP_PASSWORD`.
2. Create/select a runtime, run an experiment or execution (needs a valid `NVIDIA_API_KEY`).
3. Open **Observability** in the app (Audit feed).
4. Click **View Trace** → Langfuse Cloud UI should open with the generation.

## 6. Stop when you do not need it

Railway trial/hobby credits keep billing while services run.

- **Pause / remove deployment** on the App service when idle, or
- **Delete** the project when the demo is finished.

Managed MySQL still uses storage/credits until you delete the database service. Prefer deleting the whole project after a one-off demo.

Local development is unchanged: `docker compose up --build` with self-hosted Langfuse in Compose.

## Security checklist

- [ ] `.env` never committed; secrets only in Railway Variables
- [ ] Strong `APP_PASSWORD` and `COOKIE_SECRET`
- [ ] No phpMyAdmin (or any DB admin UI) on Railway
- [ ] Langfuse keys are project-scoped Cloud keys, not local Compose defaults
- [ ] After the demo, rotate or revoke keys if they were shared
