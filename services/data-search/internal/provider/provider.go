package provider

import (
	"context"

	"github.com/score-cripto/data-search/internal/model"
)

// BlockchainProvider abstracts fetching raw wallet data from any chain source.
type BlockchainProvider interface {
	// FetchWalletData retrieves raw on-chain data for the given chain and address.
	FetchWalletData(ctx context.Context, chain, address string) (*model.RawWalletData, error)

	// SupportedChains returns the list of chain identifiers this provider handles.
	SupportedChains() []string
}
