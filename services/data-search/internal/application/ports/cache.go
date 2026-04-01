package ports

import (
	"context"

	"github.com/score-cripto/data-search/internal/domain"
)

// WalletCachePort defines the interface for wallet data caching.
type WalletCachePort interface {
	Get(ctx context.Context, chain, address string) (*domain.WalletContext, error)
	Set(ctx context.Context, wc *domain.WalletContext) error
}
