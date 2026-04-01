package ports

import (
	"context"

	"github.com/score-cripto/data-search/internal/domain"
)

// BlockchainProviderPort abstracts fetching raw wallet data from any chain source.
type BlockchainProviderPort interface {
	FetchWalletData(ctx context.Context, chain, address string) (*domain.RawWalletData, error)
	SupportedChains() []string
}
