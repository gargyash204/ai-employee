# Local setup notes

## Ports

| Service | Default host port |
|---------|-------------------|
| Frontend (nginx in Compose) | 5173 |
| Backend | 3000 |
| MySQL | 3306 |
| phpMyAdmin | 8080 |

Override via root `.env`.

## Database

TypeORM connects using `DB_*` variables. No entities are registered yet.

## Frontend API URL

`VITE_API_BASE_URL` is baked in at frontend **build** time. Compose passes it as a build arg so the browser can reach the backend on the host (`http://localhost:3000`).
