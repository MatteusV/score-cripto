FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/ ./packages/

COPY services/process-data-ia/package.json ./services/process-data-ia/
COPY services/process-data-ia/prisma ./services/process-data-ia/prisma/
COPY services/process-data-ia/tsconfig.json ./services/process-data-ia/

RUN pnpm install --frozen-lockfile

# Build shared workspace packages before service build so their compiled JS
# ships in the production image (Node 22 cannot strip types under node_modules).
RUN pnpm --filter @score-cripto/observability-node run build

COPY services/process-data-ia/src ./services/process-data-ia/src/

RUN pnpm --filter @score-cripto/process-data-ia exec prisma generate
RUN pnpm --filter @score-cripto/process-data-ia run build

# tsc skips non-TS assets — copy Prisma query engine binaries into dist/
RUN find services/process-data-ia/src/generated/prisma -maxdepth 1 -name "*.so.node" \
      -exec cp {} services/process-data-ia/dist/generated/prisma/ \;

RUN pnpm --filter @score-cripto/process-data-ia deploy --prod /standalone
RUN cp -rT /workspace/services/process-data-ia/dist /standalone/dist
RUN cp -rT /workspace/services/process-data-ia/prisma /standalone/prisma

# ── production ───────────────────────────────────────────────────────────────

FROM node:22-bookworm-slim AS production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /standalone ./

USER appuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3002/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
