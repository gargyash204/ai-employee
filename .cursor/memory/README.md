# Feature memory index

Living context for agents. Prefer these files over re-scanning the whole codebase.

| Memory | Feature | Status |
|--------|---------|--------|
| [runtime.md](./runtime.md) | Runtime CRUD (create/list/select/edit/delete) | Shipped |
| [runtime-versioning.md](./runtime-versioning.md) | Immutable Draft / Published / Archived versions | Shipped |
| [experiment-studio.md](./experiment-studio.md) | Development Studio (iterate + optional regression) | Shipped |
| [evaluation-engine.md](./evaluation-engine.md) | Dataset Manager (datasets, Q&A cases, read-only run history) | Shipped |
| [production-executions.md](./production-executions.md) | Production executions, checkpoints, resume | Shipped |
| [observability.md](./observability.md) | AI Observability Dashboard (Audit + Langfuse) | Shipped |
| [runtime-configuration.md](./runtime-configuration.md) | Legacy instructions + questions config | Superseded by versioning |
| [railway-deploy.md](./railway-deploy.md) | Railway App + MySQL env + GitHub autodeploy | Shipped |

## Rules

- After any feature change, update the matching memory file in this folder.
- If a new feature ships, add a memory file and a row in this index.
- Keep memories short: purpose, key paths, APIs, invariants, out-of-scope.
