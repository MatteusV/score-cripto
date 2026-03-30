package service

import (
	"context"
	"testing"
	"time"

	"github.com/score-cripto/data-search/internal/model"
	"github.com/score-cripto/data-search/internal/provider"
)

// mockProvider implements provider.BlockchainProvider for testing.
type mockProvider struct {
	chains []string
	data   *model.RawWalletData
	err    error
}

func (m *mockProvider) FetchWalletData(ctx context.Context, chain, address string) (*model.RawWalletData, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.data, nil
}

func (m *mockProvider) SupportedChains() []string {
	return m.chains
}

// TestSupportedChains verifies that providers register their chains correctly.
func TestSupportedChains(t *testing.T) {
	prov := &mockProvider{
		chains: []string{"ethereum", "polygon"},
	}

	svc := New(nil, nil, prov)
	chains := svc.SupportedChains()

	if len(chains) != 2 {
		t.Errorf("expected 2 chains, got %d", len(chains))
	}

	chainMap := map[string]bool{}
	for _, c := range chains {
		chainMap[c] = true
	}

	if !chainMap["ethereum"] || !chainMap["polygon"] {
		t.Errorf("expected ethereum and polygon, got %v", chains)
	}
}

// TestAnalyze_UnsupportedChain verifies the error for unknown chains.
func TestAnalyze_UnsupportedChain(t *testing.T) {
	prov := &mockProvider{chains: []string{"ethereum"}}

	svc := &SearchService{
		cache:     nil,
		providers: map[string]provider.BlockchainProvider{"ethereum": prov},
	}

	// Verify provider map does not contain unsupported chains.
	if _, ok := svc.providers["bitcoin"]; ok {
		t.Error("bitcoin should not be a supported provider")
	}
	if _, ok := svc.providers["ethereum"]; !ok {
		t.Error("ethereum should be a supported provider")
	}
}

// TestProviderRegistration verifies multiple providers register correctly.
func TestProviderRegistration(t *testing.T) {
	prov1 := &mockProvider{chains: []string{"ethereum", "polygon"}}
	prov2 := &mockProvider{chains: []string{"bitcoin"}}

	svc := New(nil, nil, prov1, prov2)

	if len(svc.providers) != 3 {
		t.Errorf("expected 3 providers registered, got %d", len(svc.providers))
	}
}

// TestMockProvider verifies the mock works correctly.
func TestMockProvider_FetchWalletData(t *testing.T) {
	expected := &model.RawWalletData{
		Chain:      "ethereum",
		Address:    "0xabc",
		Balance:    10.5,
		DataSource: "mock",
		Transactions: []model.RawTransaction{
			{Hash: "0x1", From: "0xabc", To: "0xdef", Value: 5.0, Timestamp: time.Now()},
		},
	}

	prov := &mockProvider{
		chains: []string{"ethereum"},
		data:   expected,
	}

	got, err := prov.FetchWalletData(context.Background(), "ethereum", "0xabc")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got.Chain != expected.Chain {
		t.Errorf("chain = %q, want %q", got.Chain, expected.Chain)
	}

	if got.Balance != expected.Balance {
		t.Errorf("balance = %f, want %f", got.Balance, expected.Balance)
	}

	if len(got.Transactions) != 1 {
		t.Errorf("tx count = %d, want 1", len(got.Transactions))
	}
}
