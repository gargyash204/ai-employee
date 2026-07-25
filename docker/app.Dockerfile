# syntax=docker/dockerfile:1
# Combined production image: Nest API + nginx SPA (same origin).
# Build context: repository root
# Railway builds the final stage by default.

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

FROM base AS backend-deps
COPY .npmrc ./
COPY apps/backend/package.json ./
RUN pnpm install

FROM base AS backend-build
COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-deps /app/package.json ./
COPY apps/backend/ .
RUN pnpm run build

FROM base AS frontend-deps
COPY .npmrc ./
COPY apps/frontend/package.json ./
RUN pnpm install

FROM base AS frontend-build
# Empty = same-origin Axios calls (nginx proxies API paths).
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY --from=frontend-deps /app/node_modules ./node_modules
COPY --from=frontend-deps /app/package.json ./
COPY apps/frontend/ .
RUN pnpm run build

FROM node:22-alpine AS production
RUN apk add --no-cache nginx gettext \
  && mkdir -p /etc/nginx/templates /run/nginx \
  && rm -f /etc/nginx/http.d/default.conf

WORKDIR /app
ENV NODE_ENV=production

COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-build /app/dist ./dist
COPY apps/backend/package.json ./

COPY --from=frontend-build /app/dist /usr/share/nginx/html
COPY docker/nginx.app.conf /etc/nginx/templates/default.conf.template
COPY docker/app-entrypoint.sh /app-entrypoint.sh
RUN chmod +x /app-entrypoint.sh

EXPOSE 8080
CMD ["/app-entrypoint.sh"]
