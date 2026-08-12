FROM node:22-slim AS base
# Install pnpm from the standalone linuxstatic release: both `corepack enable`
# and `npm install -g pnpm` crash with QEMU SIGSEGV when building linux/amd64
# on an arm64 runner. The standalone binary avoids the npm/node subprocess
# path during install.
ARG TARGETARCH
RUN apt-get update && \
    apt-get install -y --no-install-recommends wget ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    case "${TARGETARCH:-amd64}" in \
      amd64) A=x64 ;; \
      arm64) A=arm64 ;; \
      *) echo "unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
    esac && \
    wget -q "https://github.com/pnpm/pnpm/releases/download/v9.15.4/pnpm-linuxstatic-${A}" \
      -O /usr/local/bin/pnpm && \
    chmod +x /usr/local/bin/pnpm && \
    pnpm --version
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/db/package.json packages/db/
COPY packages/db/prisma packages/db/prisma
COPY packages/shared/package.json packages/shared/
COPY packages/api/package.json packages/api/
COPY apps/web/package.json apps/web/
# apps/web's postinstall runs `node scripts/patch-powersync-wasm.mjs`, so the
# scripts dir must exist during install or pnpm fails with MODULE_NOT_FOUND.
COPY apps/web/scripts apps/web/scripts
RUN pnpm install --frozen-lockfile

# Build
FROM base AS builder
ARG SKIP_TYPECHECK_ON_BUILD=0
ENV SKIP_TYPECHECK_ON_BUILD=$SKIP_TYPECHECK_ON_BUILD
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter @zor/db db:generate
# Regenerate the PowerSync web worker assets into apps/web/public. They are
# gitignored, so `COPY . .` above didn't bring them in; without this the
# Next.js build ships without the offline-sync worker.
RUN pnpm --filter @zor/web run postinstall
RUN pnpm --filter @zor/web build

# Runtime
FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

# postgresql-client provides pg_isready, used by entrypoint.sh to wait for the
# database before running migrations (avoids the first-boot migration race).
RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Prisma CLI + tsx are needed at runtime for migrations and dev seeding.
# In the builder image they live in pnpm's .pnpm/ store with symlinks; the
# minimal runtime copy below would dangle those symlinks. Install both
# globally so they're on PATH for the entrypoint and any docker exec.
RUN npm install -g prisma@6.3 tsx@4.21

COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/seeds ./packages/db/seeds
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
# packages/db/node_modules is full of pnpm symlinks pointing at the workspace
# .pnpm/ store. The seed scripts (prisma db seed / tsx seeds/seed-dev.ts) need
# @prisma/client + bcryptjs at the resolved targets, so copy the store too.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ARG BUILD_SHA=dev
ENV BUILD_SHA=$BUILD_SHA

EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "apps/web/server.js"]
