package provider

import (
	"context"
	"time"

	"github.com/score-cripto/data-search/internal/domain"
)

// MockProvider is a dev-only provider used when no API key is configured.
// It returns synthetic but structurally valid wallet data so the full event
// pipeline can be exercised locally without external credentials.
type MockProvider struct{}

func NewMockProvider() *MockProvider {
	return &MockProvider{}
}

func (p *MockProvider) SupportedChains() []string {
	return []string{
		"ethereum", "polygon", "arbitrum", "optimism", "base", "avalanche", "bsc",
		"bitcoin", "solana",
	}
}

func (p *MockProvider) FetchWalletData(_ context.Context, chain, address string) (*domain.RawWalletData, error) {
	now := time.Now()

	return &domain.RawWalletData{
		Chain:   chain,
		Address: address,
		Transactions: []domain.RawTransaction{
			{Hash: "0xmock1", From: address, To: "0xrecipient1", Value: 0.5, Timestamp: now.Add(-30 * 24 * time.Hour)},
			{Hash: "0xmock2", From: "0xsender1", To: address, Value: 1.2, Timestamp: now.Add(-60 * 24 * time.Hour)},
			{Hash: "0xmock3", From: address, To: "0xrecipient2", Value: 0.1, Timestamp: now.Add(-90 * 24 * time.Hour)},
		},
		InternalTransactions: []domain.RawTransaction{},
		NFTTransfers:         []domain.RawTransaction{},
		ERC1155Transfers:     []domain.RawTransaction{},
		Balance:              0.85,
		TokenHoldings: []domain.TokenHolding{
			{ContractAddress: "0xtoken1", Symbol: "USDC", Balance: 500},
			{ContractAddress: "0xtoken2", Symbol: "LINK", Balance: 10},
		},
		FirstTxTime: now.Add(-90 * 24 * time.Hour),
		LastTxTime:  now.Add(-30 * 24 * time.Hour),
		DataSource:  "mock",
	}, nil
}
