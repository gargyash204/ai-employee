# Environment variables

Single source of truth: root `.env` (from `.env.example`). Docker Compose injects these into services. There are no app-level `.env` files.

| Variable | Purpose |
|----------|---------|
| `MYSQL_ROOT_PASSWORD` | MySQL root password (Compose container init) |
| `MYSQL_DATABASE` / `MYSQL_USER` / `MYSQL_PASSWORD` | Compose MySQL image init user/db |
| `MYSQL_PORT` | Host port for MySQL |
| `PHPMYADMIN_PORT` | Host port for phpMyAdmin |
| `BACKEND_PORT` | Host port for NestJS |
| `FRONTEND_PORT` | Host port for frontend |
| `NODE_ENV` | Node environment |
| `APP_USERNAME` / `APP_PASSWORD` | Reviewer login |
| `COOKIE_SECRET` | Session cookie signing |
| `MYSQLHOST` / `MYSQLPORT` / `MYSQLUSER` / `MYSQLPASSWORD` / `MYSQLDATABASE` | TypeORM MySQL connection (same names as Railway MySQL) |
| `CORS_ORIGIN` | Allowed CORS origins. On Railway, optional — falls back to `https://$RAILWAY_PUBLIC_DOMAIN` |
| `NVIDIA_API_KEY` / `NVIDIA_API_BASE_URL` / `NVIDIA_MODEL` / `NVIDIA_TIMEOUT_MS` | AI provider |
| `LANGFUSE_*` | Langfuse telemetry. Local: `BASE_URL=http://langfuse-web:3000`, `UI_URL=http://localhost:3100`, `PROJECT_ID=zamp-project`. Prod (Railway): US Cloud `https://us.cloud.langfuse.com` + Cloud keys + `LANGFUSE_PROJECT_ID` — see [deploy-railway.md](./deploy-railway.md) |
| `VITE_API_BASE_URL` | Frontend API base URL. Local: `http://localhost:3000`. Combined Railway image builds with empty string (same-origin via nginx) |

See `.env.example` for the full list and defaults. Railway deploy steps: [deploy-railway.md](./deploy-railway.md).
