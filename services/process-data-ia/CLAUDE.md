# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev                  # Start with hot-reload (tsx watch)
pnpm build                # Compile TypeScript to dist/
pnpm start                # Run compiled output
pnpm test                 # Run all use-case tests (vitest)
pnpm test:watch           # Watch mode
pnpm test src/use-cases/analysis-request/create-analysis-request-use-case.spec.ts  # Run single test file
pnpm db:migrate           # Run Prisma migrations (requires DATABASE_URL)
pnpm db:generate          # Regenerate Prisma client after schema changes
pnpm check                # Lint with Ultracite/Biome
pnpm fix                  # Auto-fix lint issues
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3002` | HTTP server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `OPENAI_API_KEY` | — | Required for AI scoring |
| `RABBITMQ_URL` | `amqp://localhost:5672` | RabbitMQ connection |
| `SCORE_VALIDITY_HOURS` | `24` | TTL for cached scores |

Run the full local stack from the repo root: `docker compose up`.

## Architecture

This service follows a layered architecture with a clear separation between HTTP, use-cases, repositories, and external services.

### Request flow for `POST /score`

1. **Route** (`src/routes/score.ts`) — validates input via Zod, computes a SHA-256 hash of the wallet context
2. **Cache check** — queries `ProcessedData` in Postgres; returns immediately if a valid (non-expired) score exists for the same `(chain, address, walletContextHash)`
3. **AI scoring** (`src/services/scoring.ts`) — calls OpenAI via Vercel AI SDK (`generateObject`) with a structured Zod schema; falls back to `scoreWithHeuristic()` on any error
4. **Persistence** — creates `AnalysisRequest` + `ProcessedData` records in Postgres, updates request status to `COMPLETED`
5. **Event** — fires `wallet.score.calculated` on RabbitMQ topic exchange `score-cripto.events` (fire-and-forget; failure is non-fatal)

### Key layers

| Layer | Path | Role |
|---|---|---|
| Routes | `src/routes/` | HTTP handler, input validation, orchestration |
| Use Cases | `src/use-cases/analysis-request/` | Business logic, testable without I/O |
| Repository interface | `src/repositories/analysis-request-repository.ts` | Port (interface) for persistence |
| In-memory repo | `src/repositories/in-memory/` | Test double; used in unit tests |
| Services | `src/services/` | `scoring.ts` (AI + heuristic), `database.ts` (Prisma singleton) |
| Events | `src/events/publisher.ts` | RabbitMQ wrapper; degraded-gracefully when unavailable |
| Schemas | `src/schemas/score.ts` | Zod schemas shared between routes and scoring service |
| Generated | `src/generated/prisma/` | Auto-generated Prisma client — **never edit manually** |

### Data models (Prisma)

- **`AnalysisRequest`** — tracks lifecycle (`PENDING → PROCESSING → COMPLETED | FAILED`), stores `walletContextHash` for deduplication
- **`ProcessedData`** — stores the AI output (score, confidence, reasoning, positive/risk factors) with `validUntil` for TTL-based caching

### Testing pattern

Use cases are tested in isolation with the in-memory repository. No database or HTTP server is needed:

```ts
// Arrange
const repo = new AnalysisRequestInMemoryRepository();
const sut = new CreateAnalysisRequestUseCase(repo);

// Act / Assert
const { analysisRequest } = await sut.execute({ ... });
```

Tests live alongside use-case files as `*.spec.ts` and are discovered by `vitest --dir src/use-cases`.

### AI scoring

- Model: `gpt-4o-mini` (configured in `src/services/scoring.ts`)
- Output schema enforced via `generateObject` + Zod — no prompt-level JSON parsing
- `PROMPT_VERSION` and `MODEL_ID` are constants — bump them when changing prompt or model to preserve audit trail
- Heuristic fallback (`scoreWithHeuristic`) is rule-based and always available without an API key
