# Forjapp web (Next.js). Build from the repository root:
#   docker build -f apps/web/Dockerfile -t forjapp-web .
FROM node:22-bookworm-slim AS deps
WORKDIR /repo
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/runtime/package.json packages/runtime/
COPY apps/web/package.json apps/web/
COPY apps/web/prisma apps/web/prisma
COPY apps/builder/package.json apps/builder/
RUN npm ci --workspace @forjapp/web --workspace @forjapp/runtime --workspace @forjapp/shared --include-workspace-root --ignore-scripts \
 && npx prisma generate --schema apps/web/prisma/schema.prisma

FROM deps AS build
COPY packages packages
COPY apps/web apps/web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:runtime && npm run build -w @forjapp/web

# Used by docker-compose's one-shot "migrate" service (has prisma CLI + tsx).
FROM build AS migrate
WORKDIR /repo/apps/web
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts"]

FROM node:22-bookworm-slim AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/* \
 && groupadd -r app && useradd -r -g app app && mkdir -p /data/storage && chown app:app /data/storage
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 STORAGE_DIR=/data/storage
COPY --from=build --chown=app:app /repo/apps/web/.next/standalone ./
COPY --from=build --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=app:app /repo/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
