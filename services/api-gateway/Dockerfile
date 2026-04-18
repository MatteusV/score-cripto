FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

# Workspace root
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/ ./packages/

# Service manifest + prisma schema
COPY services/api-gateway/package.json ./services/api-gateway/
COPY services/api-gateway/prisma ./services/api-gateway/prisma/
COPY services/api-gateway/tsconfig.json ./services/api-gateway/

RUN pnpm install --frozen-lockfile

# Build shared workspace packages before service build so their compiled JS
# ships in the production image (Node 22 cannot strip types under node_modules).
RUN pnpm --filter @score-cripto/observability-node run build

COPY services/api-gateway/src ./services/api-gateway/src/

RUN pnpm --filter @score-cripto/api-gateway exec prisma generate
RUN pnpm --filter @score-cripto/api-gateway run build

# Standalone deploy — prod deps only, resolves workspace:* packages
RUN pnpm --filter @score-cripto/api-gateway deploy --prod /standalone

# Copy compiled output (-T avoids nesting if target already exists)
RUN cp -rT /workspace/services/api-gateway/dist /standalone/dist
RUN cp -rT /workspace/services/api-gateway/prisma /standalone/prisma

# ── production ───────────────────────────────────────────────────────────────

FROM node:22-bookworm-slim AS production

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /standalone ./

USER appuser

EXPOSE 3001

CMD ["node", "dist/index.js"]
