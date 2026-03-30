package service

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	"github.com/score-cripto/data-search/internal/cache"
	"github.com/score-cripto/data-search/internal/events"
	"github.com/score-cripto/data-search/internal/model"
	"github.com/score-cripto/data-search/internal/normalizer"
	"github.com/score-cripto/data-search/internal/provider"
)

// SearchService orchestrates cache checks, provider fetches, normalization, and event publishing.
type SearchService struct {
	cache     *cache.Cache
	providers map[string]provider.BlockchainProvider
	publisher *events.Publisher
}

// New creates a SearchService with the given dependencies.
func New(c *cache.Cache, pub *events.Publisher, providers ...provider.BlockchainProvider) *SearchService {
	pm := make(map[string]provider.BlockchainProvider)
	for _, p := range providers {
		for _, chain := range p.SupportedChains() {
			pm[strings.ToLower(chain)] = p
		}
	}

	return &SearchService{
		cache:     c,
		providers: pm,
		publisher: pub,
	}
}

// SupportedChains returns all chains that have a registered provider.
func (s *SearchService) SupportedChains() []string {
	chains := make([]string, 0, len(s.providers))
	for chain := range s.providers {
		chains = append(chains, chain)
	}
	return chains
}

// Analyze performs the full analysis flow: cache check -> fetch -> normalize -> cache -> publish.
func (s *SearchService) Analyze(ctx context.Context, chain, address string) (*model.WalletContext, error) {
	chain = strings.ToLower(strings.TrimSpace(chain))
	address = normalizer.NormalizeAddress(chain, address)

	// 1. Check cache.
	cached, err := s.cache.Get(ctx, chain, address)
	if err != nil {
		slog.Warn("cache read error, proceeding to fetch", "error", err)
	}
	if cached != nil {
		slog.Info("returning cached result", "chain", chain, "address", address)
		return cached, nil
	}

	// 2. Find provider for the chain.
	prov, ok := s.providers[chain]
	if !ok {
		return nil, fmt.Errorf("unsupported chain: %s", chain)
	}

	// 3. Fetch raw data.
	slog.Info("fetching wallet data from provider", "chain", chain, "address", address)
	raw, err := prov.FetchWalletData(ctx, chain, address)
	if err != nil {
		return nil, fmt.Errorf("provider fetch: %w", err)
	}

	// 4. Normalize.
	wc := normalizer.Normalize(raw)

	// 5. Cache the result.
	if err := s.cache.Set(ctx, wc); err != nil {
		slog.Error("failed to cache result", "error", err)
		// Non-fatal: still return the result.
	}

	// 6. Publish event (best effort).
	if s.publisher != nil {
		if err := s.publisher.PublishWalletCached(ctx, wc); err != nil {
			slog.Error("failed to publish event", "error", err)
		}
	}

	return wc, nil
}

// GetCached returns only cached data, or nil if not found.
func (s *SearchService) GetCached(ctx context.Context, chain, address string) (*model.WalletContext, error) {
	chain = strings.ToLower(strings.TrimSpace(chain))
	address = normalizer.NormalizeAddress(chain, address)
	return s.cache.Get(ctx, chain, address)
}
