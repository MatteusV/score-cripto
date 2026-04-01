package usecase

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/score-cripto/data-search/internal/domain"
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

// ProcessWalletDataRequested is the main use case for processing wallet data requests.
type ProcessWalletDataRequested struct {
	cache      WalletCachePort
	providers  map[string]BlockchainProviderPort
	publisher  EventPublisherPort
	normalizer NormalizerFunc
}

// NewProcessWalletDataRequested creates a new use case instance.
func NewProcessWalletDataRequested(
	cache WalletCachePort,
	providers map[string]BlockchainProviderPort,
	publisher EventPublisherPort,
	normalizer NormalizerFunc,
) *ProcessWalletDataRequested {
	return &ProcessWalletDataRequested{
		cache:      cache,
		providers:  providers,
		publisher:  publisher,
		normalizer: normalizer,
	}
}

// Execute runs the cache-first wallet data processing flow.
func (uc *ProcessWalletDataRequested) Execute(ctx context.Context, input ProcessWalletDataRequestedInput) (ProcessWalletDataRequestedOutput, error) {
	chain := strings.ToLower(strings.TrimSpace(input.Chain))
	address := normalizeAddress(chain, input.Address)

	// 1. Check cache.
	cached, err := uc.cache.Get(ctx, chain, address)
	if err != nil {
		slog.WarnContext(ctx, "cache read error, proceeding to fetch", "error", err)
	}
	if cached != nil {
		slog.InfoContext(ctx, "returning cached result", "chain", chain, "address", address)
		return ProcessWalletDataRequestedOutput{WalletContext: cached, CacheHit: true}, nil
	}

	// 2. Verify chain is supported.
	prov, ok := uc.providers[chain]
	if !ok {
		return ProcessWalletDataRequestedOutput{}, fmt.Errorf("%w: %s", ErrUnsupportedChain, chain)
	}

	// 3. Fetch raw data from provider.
	slog.InfoContext(ctx, "fetching wallet data from provider", "chain", chain, "address", address)
	raw, err := prov.FetchWalletData(ctx, chain, address)
	if err != nil {
		return ProcessWalletDataRequestedOutput{}, fmt.Errorf("provider fetch: %w", err)
	}

	// 4. Normalize.
	wc := uc.normalizer(raw)

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
