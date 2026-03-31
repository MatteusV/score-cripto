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

## Code Quality (Biome/Ultracite)

This project uses **Ultracite** (zero-config Biome preset) for strict code quality. Run `pnpm fix` before committing.

### Common Biome Lint Rules

| Rule | Issue | Fix |
|---|---|---|
| **`useAwait`** | `async` function without `await` | Remove `async` keyword OR add `await` to a call |
| **`noParameterProperties`** | Constructor parameter with visibility modifier: `constructor(private repo: Repo)` | Convert to explicit property: `private repo: Repo; constructor(repo: Repo) { this.repo = repo; }` |
| **`useConsistentMemberAccessibility`** | Mix of `public`/implicit member access | Remove `public` keyword (implicit is default in TypeScript) |
| **`noImplicitAnyLet`** | Variable without type: `let x;` | Add type annotation: `let x: SomeType;` OR initialize with value: `let x = value;` |
| **`noBarrelFile`** | Re-exporting from index files | Avoid `export { x } from './file.js'` — import directly instead |
| **`useConsistentTypeDefinitions`** | Mix of `type` and `interface` | Prefer `interface` for object shapes (Biome default) |
| **`noEvolvingTypes`** | Variable type evolves through assignments | Add explicit type annotation upfront |

### Fixing Async Functions

**Problem**: Function marked `async` but never calls `await`
```ts
// ❌ Wrong
async execute(req: Request): Promise<Response> {
  return this.repo.get(id);  // No await
}

// ✅ Right - remove async
execute(req: Request): Promise<Response> {
  return this.repo.get(id);  // Promise returned directly
}
```

### Fixing Parameter Properties

**Problem**: Constructor parameter with visibility modifier
```ts
// ❌ Wrong
constructor(private readonly repo: Repository) {}

// ✅ Right - explicit property
private readonly repo: Repository;

constructor(repo: Repository) {
  this.repo = repo;
}
```

### Fixing Variable Types

**Problem**: Variable without type annotation
```ts
// ❌ Wrong
let result;  // implicitly any
result = await someFunction();

// ✅ Right - declare type upfront
let result: SomeType;
result = await someFunction();

// OR - initialize with value
const result = await someFunction();  // type inferred from return
```

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
