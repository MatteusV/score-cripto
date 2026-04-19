FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/ ./packages/

COPY services/users/package.json ./services/users/
COPY services/users/prisma ./services/users/prisma/
COPY services/users/tsconfig.json ./services/users/

RUN pnpm install --frozen-lockfile

# Build shared workspace packages before service build so their compiled JS
# ships in the production image (Node 22 cannot strip types under node_modules).
RUN pnpm --filter @score-cripto/observability-node run build

COPY services/users/src ./services/users/src/

RUN pnpm --filter @score-cripto/users exec prisma generate
RUN pnpm --filter @score-cripto/users run build

# tsc skips non-TS assets — copy Prisma query engine binaries into dist/
RUN find services/users/src/generated/prisma -maxdepth 1 -name "*.so.node" \
      -exec cp {} services/users/dist/generated/prisma/ \;

RUN pnpm --filter @score-cripto/users deploy --prod /standalone
RUN cp -rT /workspace/services/users/dist /standalone/dist
RUN cp -rT /workspace/services/users/prisma /standalone/prisma

# ── production ───────────────────────────────────────────────────────────────

FROM node:22-bookworm-slim AS production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /standalone ./

USER appuser

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3003/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
