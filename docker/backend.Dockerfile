# syntax=docker/dockerfile:1
# Build context: repository root

FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate \
  && apk add --no-cache tesseract-ocr tesseract-ocr-data-eng poppler-utils
WORKDIR /app

FROM base AS deps
COPY .npmrc ./
COPY apps/backend/package.json ./
RUN pnpm install

FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY apps/backend/ .
ENV CHOKIDAR_USEPOLLING=true
ENV WATCHPACK_POLLING=true
EXPOSE 3000
CMD ["sh", "-c", "pnpm run migration:run && pnpm run start:dev"]

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./
COPY apps/backend/ .
RUN pnpm run build

FROM node:22-alpine AS runtime
RUN apk add --no-cache tesseract-ocr tesseract-ocr-data-eng poppler-utils
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY apps/backend/package.json ./
EXPOSE 3000
CMD ["sh", "-c", "node ./node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js && node dist/main.js"]
