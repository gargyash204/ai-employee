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

**Important:** Deploy **one** App service built from [`docker/app.Dockerfile`](../docker/app.Dockerfile). Do **not** create separate Frontend and Backend services — that uses Railpack/Nixpacks, which often fails with `pnpm: command not found`.

---

## 1. Langfuse Cloud (before or while setting Railway)

1. Create an account at [cloud.langfuse.com](https://cloud.langfuse.com).
2. Create a project and copy the **public** and **secret** API keys.
3. You will paste these into Railway Variables in step 5.

---

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

---

## 3. Railway project — one App + MySQL

1. Open [railway.app](https://railway.app) → **New Project**.
2. **Deploy from GitHub repo** → select this repository.
3. If Railway offers multiple services (frontend / backend / root), keep **only one** service for the app (or empty canvas and add the repo once).
4. Confirm the App service build settings:
   - **Builder:** Dockerfile
   - **Dockerfile path:** `docker/app.Dockerfile`
   - Root directory: repo root (empty / `/`), **not** `apps/frontend` or `apps/backend`
5. Root [`railway.toml`](../railway.toml) already sets the Dockerfile builder — leave it unless Settings override it.
6. **+ New** → **Database** → **MySQL**.
7. On the **App** service → **Settings** → **Networking** → **Generate Domain**.

Rename services in the canvas if you like (e.g. `App`, `MySQL`) so variable references match the table below.

### If you already see Frontend + Backend failing

Those are wrong. Delete them (or remove the repo from those services). Keep a single App service pointed at `docker/app.Dockerfile` as above, then redeploy.

---

## 4. When to add environment variables

Add variables on the **App** service only (not on MySQL).

| When | What |
|------|------|
| **After** MySQL exists | Reference Railway MySQL vars (`MYSQLHOST=${{MySQL.MYSQLHOST}}`, etc.) — or use Variable → Add Reference |
| **After** public domain exists | Optional `CORS_ORIGIN` — app auto-uses `https://$RAILWAY_PUBLIC_DOMAIN` if unset |
| **Before** a successful boot | `APP_USERNAME`, `APP_PASSWORD`, `COOKIE_SECRET`, `NODE_ENV=production` |
| **Before** AI / traces work | `NVIDIA_*`, `LANGFUSE_*` (app can start without these; features will fail until set) |

Practical order:

1. Create App (Dockerfile) + MySQL + Generate Domain.
2. Open App → **Variables** → paste the block in step 5 (fill secrets).
3. **Redeploy** the App service (Railway usually auto-redeploys on variable save).

You do **not** need env vars for the Docker **image build** (Vite uses empty `VITE_API_BASE_URL` for same-origin). Variables are required at **runtime** for DB, auth, NVIDIA, and Langfuse.

---

## 5. Environment variables (App service only)

Open the App service → **Variables**. Paste via Raw Editor or add one-by-one.

Use Railway [reference variables](https://docs.railway.com/guides/variables#referencing-another-services-variable) for MySQL. If your MySQL service is named differently, change `MySQL` in the `${{…}}` references.

The app reads Railway’s native names (`MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`) — same keys locally and on Railway.

```bash
NODE_ENV=production

# MySQL (reference the managed MySQL service — adjust service name if needed)
MYSQLHOST=${{MySQL.MYSQLHOST}}
MYSQLPORT=${{MySQL.MYSQLPORT}}
MYSQLUSER=${{MySQL.MYSQLUSER}}
MYSQLPASSWORD=${{MySQL.MYSQLPASSWORD}}
MYSQLDATABASE=${{MySQL.MYSQLDATABASE}}

# Auth — use strong unique values for the demo
APP_USERNAME=
APP_PASSWORD=
COOKIE_SECRET=

# Optional — if unset, CORS uses https://${{RAILWAY_PUBLIC_DOMAIN}}
# CORS_ORIGIN=https://${{RAILWAY_PUBLIC_DOMAIN}}

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

---

## 5b. GitHub → Railway auto-redeploy

Railway redeploys when you **push** (or merge) to the branch linked on the App service. There is no GitHub Action required.

1. App service → **Settings** → **Source**
2. Confirm the **GitHub repo** is connected (`ai-employee` or whatever you use).
3. Set **Trigger branch** to the branch you merge into (`master` or `staging` — must match).
4. Ensure **Autodeploy** is **Enabled**.
5. If you have **no** GitHub Actions CI, leave **Wait for CI** **off**. If it is on with no passing workflows, deploys stay skipped.
6. Do not add restrictive **Watch Paths** unless you intend to ignore some folders (this repo’s `railway.toml` does not set them).

After a merge to the trigger branch, Railway should show a new deployment “via GitHub”. If nothing appears: **Show Skipped**, reconnect the repo, or use Command Palette → **Deploy Latest Commit**.

---

## 6. Smoke test

1. Open the App public URL → login with `APP_USERNAME` / `APP_PASSWORD`.
2. Create/select a runtime, run an experiment or execution (needs a valid `NVIDIA_API_KEY`).
3. Open **Overview** in the app (activity feed).
4. Click **View Trace** → Langfuse Cloud UI should open with the generation.

---

## 7. Stop when you do not need it

Railway trial/hobby credits keep billing while services run.

- **Pause / remove deployment** on the App service when idle, or
- **Delete** the project when the demo is finished.

Managed MySQL still uses storage/credits until you delete the database service. Prefer deleting the whole project after a one-off demo.

Local development is unchanged: `docker compose up --build` with self-hosted Langfuse in Compose.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `pnpm: command not found` on Frontend **and** Backend | You have separate Node services. Delete them; deploy **one** Dockerfile App (`docker/app.Dockerfile`). |
| Build fails on Dockerfile `pnpm` steps | Pull latest repo (Dockerfile installs pnpm via `npm install -g pnpm@10.33.2`), clear build cache, redeploy. |
| App crashes on start / migration errors | MySQL not linked or `MYSQLHOST` / … refs wrong / empty — fix Variables, redeploy. |
| Login / CORS issues | Confirm public domain exists; set `CORS_ORIGIN` or rely on `RAILWAY_PUBLIC_DOMAIN` auto-fallback. |
| No “View Trace” | Set Langfuse Cloud keys + `LANGFUSE_BASE_URL` / `LANGFUSE_UI_URL` to `https://cloud.langfuse.com`. |
| Push/merge does not redeploy | App → Settings → Source: Autodeploy on, trigger branch matches merge target, Wait for CI off (if no Actions). |

---

## Security checklist

- [ ] `.env` never committed; secrets only in Railway Variables
- [ ] Strong `APP_PASSWORD` and `COOKIE_SECRET`
- [ ] No phpMyAdmin (or any DB admin UI) on Railway
- [ ] Langfuse keys are project-scoped Cloud keys, not local Compose defaults
- [ ] After the demo, rotate or revoke keys if they were shared
