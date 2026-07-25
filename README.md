# Zamp

Production-oriented take-home monorepo scaffold (setup only — no domain logic yet).

## Stack

| Area | Technology |
|------|------------|
| Backend | NestJS, TypeScript, TypeORM, MySQL 8 |
| Frontend | React, Vite, TypeScript, Tailwind CSS, shadcn/ui, Axios, React Router |
| Infra | Docker Compose (frontend, backend, MySQL, phpMyAdmin) |
| Shared | `@zamp/shared` TypeScript package |

## Repository layout

```
root
├── apps
│   ├── backend
│   └── frontend
├── packages
│   └── shared
├── docker
├── docs
├── docker-compose.yml
├── README.md
└── decisions.md
```

## Prerequisites

- Node.js 20+
- pnpm 9+ (Corepack recommended)
- Docker + Docker Compose

## Environment

Single source of truth at the repo root (Compose reads this automatically):

```bash
cp .env.example .env
```

Fill in credentials. Never commit real secrets — `.env` is gitignored; `.env.example` is the safe template.

## Run with Docker Compose

Development stack with hot reload (source is volume-mounted; Nest `--watch` + Vite HMR):

```bash
docker compose up --build
```

Edit files under `apps/backend/src` or `apps/frontend/src` and the containers pick up changes automatically.

Services:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend health | http://localhost:3000/health |
| phpMyAdmin | http://localhost:8080 |
| MySQL | localhost:3306 |

phpMyAdmin is preconfigured (`PMA_HOST=mysql`) and logs in with the Compose MySQL user.

The frontend calls `GET /health` and shows **Backend Connected** when the API responds.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm build` | Build shared → backend → frontend |
| `pnpm docker:up` | `docker compose up --build -d` |
| `pnpm docker:down` | Stop Compose stack |
| `pnpm docker:logs` | Follow Compose logs |

## Deploy (Railway demo)

Minimal public demo: one app container + Railway MySQL + [Langfuse Cloud](https://cloud.langfuse.com) (observability / View Trace). See [docs/deploy-railway.md](./docs/deploy-railway.md).

## Docs

| Doc | Contents |
|-----|----------|
| [docs/architecture.md](./docs/architecture.md) | System design + frontend user flow |
| [decisions.md](./decisions.md) | Architecture decision records |
| [docs/setup.md](./docs/setup.md) | Local ports and wiring notes |
| [docs/environment.md](./docs/environment.md) | Environment variables |
| [docs/deploy-railway.md](./docs/deploy-railway.md) | GitHub → Railway demo deploy |

See also `.cursor/memory/` for feature-level agent context.
