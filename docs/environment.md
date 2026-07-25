# Environment variables

Single source of truth: root `.env` (from `.env.example`). Docker Compose injects these into services. There are no app-level `.env` files.

| Variable | Purpose |
|----------|---------|
| `MYSQL_ROOT_PASSWORD` | MySQL root password |
| `MYSQL_DATABASE` | Initial database name |
| `MYSQL_USER` / `MYSQL_PASSWORD` | App DB user |
| `MYSQL_PORT` | Host port for MySQL |
| `PHPMYADMIN_PORT` | Host port for phpMyAdmin |
| `BACKEND_PORT` | Host port for NestJS |
| `FRONTEND_PORT` | Host port for frontend |
| `NODE_ENV` | Node environment |
| `APP_USERNAME` / `APP_PASSWORD` | Reviewer login |
| `COOKIE_SECRET` | Session cookie signing |
| `DB_HOST` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` / `DB_DATABASE` | TypeORM MySQL connection (in Compose, `DB_HOST` defaults to `mysql`) |
| `NVIDIA_API_KEY` / `NVIDIA_API_BASE_URL` / `NVIDIA_MODEL` / `NVIDIA_TIMEOUT_MS` | AI provider |
| `LANGFUSE_*` | Langfuse telemetry (keys, URLs, init). Local Compose uses self-hosted URLs; Railway demo uses Langfuse Cloud — see [deploy-railway.md](./deploy-railway.md) |
| `VITE_API_BASE_URL` | Frontend API base URL. Local: `http://localhost:3000`. Combined Railway image builds with empty string (same-origin via nginx) |

See `.env.example` for the full list and defaults. Railway deploy steps: [deploy-railway.md](./deploy-railway.md).
