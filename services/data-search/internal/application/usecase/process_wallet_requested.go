package usecase

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"

	"github.com/score-cripto/data-search/internal/domain"
	"github.com/score-cripto/data-search/internal/infrastructure/telemetry"
)

// ErrUnsupportedChain is returned when no provider supports the requested chain.
var ErrUnsupportedChain = errors.New("unsupported chain")

// BlockchainProviderPort is the port alias used by the use case layer.
// Kept here so the test package can reference it without importing ports.
type BlockchainProviderPort interface {
	FetchWalletData(ctx context.Context, chain, address string) (*domain.RawWalletData, error)
	SupportedChains() []string
}

// WalletCachePort is the cache port alias for the use case layer.
type WalletCachePort interface {
	Get(ctx context.Context, chain, address string) (*domain.WalletContext, error)
	Set(ctx context.Context, wc *domain.WalletContext) error
}

// EventPublisherPort is the publisher port alias for the use case layer.
type EventPublisherPort interface {
	PublishWalletCached(ctx context.Context, event domain.WalletDataCachedEvent) error
}

// StageEmitterPort emits pipeline stage transitions observable by the api-gateway.
// Implementations are best-effort (failures do not propagate).
type StageEmitterPort interface {
	PublishStageChanged(ctx context.Context, requestID string, stage string, state string, errorMessage string)
}

// ProcessWalletDataRequestedInput is the input DTO for the use case.
type ProcessWalletDataRequestedInput struct {
	RequestID string
	UserID    string
	Chain     string
	Address   string
}

// ProcessWalletDataRequestedOutput is the output DTO for the use case.
type ProcessWalletDataRequestedOutput struct {
	WalletContext *domain.WalletContext
	CacheHit      bool
}

// NormalizerFunc converts raw blockchain data to a structured WalletContext.
type NormalizerFunc func(raw *domain.RawWalletData) *domain.WalletContext

// Pipeline stage / state string constants (mirror of packages/observability-node enum).
const (
	stageDetect    = "detect"
	stageFetch     = "fetch"
	stageNormalize = "normalize"

	stageStateStarted   = "started"
	stageStateCompleted = "completed"
	stageStateFailed    = "failed"
)

// ProcessWalletDataRequested is the main use case for processing wallet data requests.
type ProcessWalletDataRequested struct {
	cache        WalletCachePort
	providers    map[string]BlockchainProviderPort
	publisher    EventPublisherPort
	stageEmitter StageEmitterPort
	normalizer   NormalizerFunc
}

// NewProcessWalletDataRequested creates a new use case instance.
// stageEmitter may be nil — stage events are skipped in that case.
func NewProcessWalletDataRequested(
	cache WalletCachePort,
	providers map[string]BlockchainProviderPort,
	publisher EventPublisherPort,
	normalizer NormalizerFunc,
	stageEmitter StageEmitterPort,
) *ProcessWalletDataRequested {
	return &ProcessWalletDataRequested{
		cache:        cache,
		providers:    providers,
		publisher:    publisher,
		stageEmitter: stageEmitter,
		normalizer:   normalizer,
	}
}

func (uc *ProcessWalletDataRequested) emitStage(ctx context.Context, requestID, stage, state, errorMessage string) {
	if uc.stageEmitter == nil || requestID == "" {
		return
	}
	uc.stageEmitter.PublishStageChanged(ctx, requestID, stage, state, errorMessage)
}

// Execute runs the cache-first wallet data processing flow.
func (uc *ProcessWalletDataRequested) Execute(ctx context.Context, input ProcessWalletDataRequestedInput) (ProcessWalletDataRequestedOutput, error) {
	uc.emitStage(ctx, input.RequestID, stageDetect, stageStateStarted, "")

	chain := strings.ToLower(strings.TrimSpace(input.Chain))
	address := normalizeAddress(chain, input.Address)

	uc.emitStage(ctx, input.RequestID, stageDetect, stageStateCompleted, "")

	// 1. Check cache.
	cached, err := uc.cache.Get(ctx, chain, address)
	if err != nil {
		slog.WarnContext(ctx, "cache read error, proceeding to fetch", "error", err)
	}
	if cached != nil {
		telemetry.CacheHits.Add(ctx, 1, metric.WithAttributes(attribute.String("chain", chain)))
		// Cache hit: publish stage events so UI catches up instantly.
		for _, s := range []string{stageFetch, stageNormalize} {
			uc.emitStage(ctx, input.RequestID, s, stageStateStarted, "")
			uc.emitStage(ctx, input.RequestID, s, stageStateCompleted, "")
		}
		if uc.publisher != nil {
			event := domain.NewWalletDataCachedEvent(input.RequestID, input.UserID, cached)
			if err := uc.publisher.PublishWalletCached(ctx, event); err != nil {
				slog.WarnContext(ctx, "failed to publish wallet.data.cached event from cache hit", "error", err)
			}
		}
		slog.InfoContext(ctx, "returning cached result", "chain", chain, "address", address)
		return ProcessWalletDataRequestedOutput{WalletContext: cached, CacheHit: true}, nil
	}
	telemetry.CacheMisses.Add(ctx, 1, metric.WithAttributes(attribute.String("chain", chain)))

	// 2. Verify chain is supported.
	prov, ok := uc.providers[chain]
	if !ok {
		uc.emitStage(ctx, input.RequestID, stageFetch, stageStateFailed, fmt.Sprintf("%s: %s", ErrUnsupportedChain.Error(), chain))
		return ProcessWalletDataRequestedOutput{}, fmt.Errorf("%w: %s", ErrUnsupportedChain, chain)
	}

	// 3. Fetch raw data from provider.
	uc.emitStage(ctx, input.RequestID, stageFetch, stageStateStarted, "")
	slog.InfoContext(ctx, "fetching wallet data from provider", "chain", chain, "address", address)
	raw, err := prov.FetchWalletData(ctx, chain, address)
	if err != nil {
		uc.emitStage(ctx, input.RequestID, stageFetch, stageStateFailed, err.Error())
		return ProcessWalletDataRequestedOutput{}, fmt.Errorf("provider fetch: %w", err)
	}
	uc.emitStage(ctx, input.RequestID, stageFetch, stageStateCompleted, "")

	// 4. Normalize.
	uc.emitStage(ctx, input.RequestID, stageNormalize, stageStateStarted, "")
	wc := uc.normalizer(raw)
	uc.emitStage(ctx, input.RequestID, stageNormalize, stageStateCompleted, "")

	// 5. Cache the result (non-fatal).
	if err := uc.cache.Set(ctx, wc); err != nil {
		slog.WarnContext(ctx, "failed to cache wallet data", "error", err)
	}

	// 6. Publish event (non-fatal).
	if uc.publisher != nil {
		event := domain.NewWalletDataCachedEvent(input.RequestID, input.UserID, wc)
		if err := uc.publisher.PublishWalletCached(ctx, event); err != nil {
			slog.WarnContext(ctx, "failed to publish wallet.data.cached event", "error", err)
		}
	}

	return ProcessWalletDataRequestedOutput{WalletContext: wc, CacheHit: false}, nil
}

// normalizeAddress normalizes a blockchain address based on chain conventions.
func normalizeAddress(chain, address string) string {
	address = strings.TrimSpace(address)
	switch chain {
	case "ethereum", "polygon", "arbitrum", "optimism", "avalanche", "bsc":
		return strings.ToLower(address)
	case "bitcoin", "solana":
		return address
	default:
		return strings.ToLower(address)
	}
}
