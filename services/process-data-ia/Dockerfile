FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/ ./packages/

COPY services/process-data-ia/package.json ./services/process-data-ia/
COPY services/process-data-ia/prisma ./services/process-data-ia/prisma/
COPY services/process-data-ia/tsconfig.json ./services/process-data-ia/

RUN pnpm install --frozen-lockfile

COPY services/process-data-ia/src ./services/process-data-ia/src/

RUN pnpm --filter @score-cripto/process-data-ia exec prisma generate
RUN pnpm --filter @score-cripto/process-data-ia run build

RUN pnpm --filter @score-cripto/process-data-ia deploy --prod /standalone
RUN cp -r /workspace/services/process-data-ia/dist /standalone/dist
RUN cp -r /workspace/services/process-data-ia/prisma /standalone/prisma

# ── production ───────────────────────────────────────────────────────────────

FROM node:22-bookworm-slim AS production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app

COPY --from=builder /standalone ./

USER appuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3002/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
