# CLAUDE.md

Guidance for Claude Code when working with the data-search service.

## Commands

```bash
make test                 # Run all tests
make test-verbose         # Run tests with verbose output
make test-coverage        # Generate coverage report (coverage.html)
make build                # Build worker binary
make run                  # Run the compiled worker
make dev                  # Run with hot-reload (requires air)
make clean                # Clean build artifacts
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `RABBITMQ_URL` | `amqp://localhost:5673` | RabbitMQ connection string |
| `REDIS_URL` | `redis://localhost:6380` | Redis cache connection |
| `ETHERSCAN_API_KEY` | — | Etherscan API key for blockchain data |

Run the full local stack from repo root: `docker compose up`.

## Project Structure

```
internal/
├── domain/                    # Business logic types & events
│   ├── wallet.go             # WalletContext, RawWalletData, TokenHolding
│   └── events.go             # Event contracts (WalletDataRequestedEvent, WalletDataCachedEvent)
├── application/
│   ├── ports/                # Interfaces (contracts)
│   │   ├── cache.go          # WalletCachePort
│   │   ├── provider.go       # BlockchainProviderPort
│   │   └── publisher.go      # EventPublisherPort
│   └── usecase/
│       └── process_wallet_requested.go  # Main use case logic
├── infrastructure/
│   ├── cache/
│   │   └── redis_cache.go    # Redis adapter (WalletCachePort impl)
│   ├── provider/
│   │   ├── etherscan.go      # Etherscan adapter (BlockchainProviderPort impl)
│   │   └── normalizer.go     # Data normalization
│   └── events/
│       ├── rabbitmq_consumer.go   # RabbitMQ consumer
│       └── rabbitmq_publisher.go  # RabbitMQ publisher
cmd/
└── worker/
    └── main.go               # Entry point with graceful shutdown
```

## Architecture

This service follows **Clean Architecture** with domain-driven design:

- **Domain** (`internal/domain/`) — Pure business logic, no dependencies
- **Application** (`internal/application/ports/`) — Use case interfaces (ports)
- **Infrastructure** (`internal/infrastructure/`) — Concrete implementations (adapters)

### Request Flow: `wallet.data.requested` Event

1. **RabbitMQ Consumer** receives `wallet.data.requested` event
2. **Validate** event payload (user ID, chain, address)
3. **Normalize** address (remove 0x prefix, lowercase, etc.)
4. **Cache Check** — if valid wallet exists in Redis, return immediately
5. **Fetch Data** — call Etherscan (or other provider) for on-chain data
6. **Normalize Data** — structure raw response into `WalletContext`
7. **Cache Set** — store in Redis with 20-minute TTL (fire-and-forget if fails)
8. **Publish Event** — emit `wallet.data.cached` on RabbitMQ (fire-and-forget if fails)
9. **ACK** event from queue

### Error Handling & ACK Policy

- **Invalid Payload** → NACK (no requeue) — malformed event
- **Transient Error** (network, timeout) → NACK + requeue — try again
- **Success** → ACK — event fully processed

## Testing

Tests are located alongside source files as `*_test.go`:

```bash
# Run all tests
go test ./...

# Run specific package
go test ./internal/domain
go test ./internal/application/usecase

# Run with coverage
go test -v -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

Tests use **in-memory implementations** of ports as test doubles:

```go
// Example: in-memory cache for unit tests
type mockCache struct {
  data map[string]*WalletContext
}

func (m *mockCache) Get(ctx context.Context, key string) (*WalletContext, error) {
  return m.data[key], nil
}
```

## Code Quality

Go standard formatting:

```bash
gofmt -w ./...           # Auto-format
go vet ./...             # Static analysis
golangci-lint run        # (if installed) comprehensive linting
```

## Key Design Decisions

1. **Cache-First Strategy**: Return cached wallet data without re-fetching if still valid (20 min TTL)
2. **Fire-and-Forget Events**: Cache set and event publish failures don't block the main flow
3. **Port-Based Testing**: All I/O (Redis, RabbitMQ, HTTP) can be mocked via interfaces
4. **No External Logging Framework**: Use standard `log` package or structured logging if needed
5. **Graceful Shutdown**: Worker handles SIGINT/SIGTERM, drains in-flight messages before exiting

## Dependencies

- **RabbitMQ** (`github.com/rabbitmq/amqp091-go`) — event consumer/publisher
- **Redis** (`github.com/redis/go-redis/v9`) — wallet data cache

See `go.mod` for full list.
