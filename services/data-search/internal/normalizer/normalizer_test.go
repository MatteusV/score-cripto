package normalizer

import (
	"testing"
	"time"

	"github.com/score-cripto/data-search/internal/model"
)

func TestNormalizeAddress_Ethereum(t *testing.T) {
	tests := []struct {
		chain   string
		address string
		want    string
	}{
		{"ethereum", "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", "0xab5801a7d398351b8be11c439e05c5b3259aec9b"},
		{"polygon", "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", "0xab5801a7d398351b8be11c439e05c5b3259aec9b"},
		{"ethereum", "  0xABC123  ", "0xabc123"},
	}

	for _, tt := range tests {
		got := NormalizeAddress(tt.chain, tt.address)
		if got != tt.want {
			t.Errorf("NormalizeAddress(%q, %q) = %q, want %q", tt.chain, tt.address, got, tt.want)
		}
	}
}

func TestNormalizeAddress_Bitcoin(t *testing.T) {
	addr := "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
	got := NormalizeAddress("bitcoin", addr)
	if got != addr {
		t.Errorf("Bitcoin address should not be lowercased: got %q, want %q", got, addr)
	}
}

func TestNormalizeAddress_Solana(t *testing.T) {
	addr := "4fYNw3dojWmQ4dXtSGE9epjRGy9pFSx62YypT7avPYvA"
	got := NormalizeAddress("solana", addr)
	if got != addr {
		t.Errorf("Solana address should not be lowercased: got %q, want %q", got, addr)
	}
}

func TestNormalize_BasicMetrics(t *testing.T) {
	now := time.Now().UTC()
	thirtyDaysAgo := now.AddDate(0, 0, -30)

	raw := &model.RawWalletData{
		Chain:   "ethereum",
		Address: "0xABC",
		Transactions: []model.RawTransaction{
			{Hash: "0x1", From: "0xabc", To: "0xdef", Value: 1.0, Timestamp: thirtyDaysAgo},
			{Hash: "0x2", From: "0x123", To: "0xabc", Value: 2.0, Timestamp: now.AddDate(0, 0, -15)},
			{Hash: "0x3", From: "0xabc", To: "0x456", Value: 3.0, Timestamp: now.AddDate(0, 0, -1)},
		},
		Balance:     5.0,
		FirstTxTime: thirtyDaysAgo,
		LastTxTime:  now.AddDate(0, 0, -1),
		DataSource:  "etherscan",
	}

	wc := Normalize(raw)

	if wc.TxCount != 3 {
		t.Errorf("TxCount = %d, want 3", wc.TxCount)
	}

	if wc.TotalVolume != 6.0 {
		t.Errorf("TotalVolume = %f, want 6.0", wc.TotalVolume)
	}

	// 0xdef, 0x123, 0x456 = 3 unique counterparties
	if wc.UniqueCounterparties != 3 {
		t.Errorf("UniqueCounterparties = %d, want 3", wc.UniqueCounterparties)
	}

	if wc.WalletAgeDays < 29 || wc.WalletAgeDays > 31 {
		t.Errorf("WalletAgeDays = %d, want ~30", wc.WalletAgeDays)
	}

	// Largest tx is 3.0 out of 6.0 total = 0.5
	if wc.LargestTxRatio != 0.5 {
		t.Errorf("LargestTxRatio = %f, want 0.5", wc.LargestTxRatio)
	}

	// Average: 6.0 / 3 = 2.0
	if wc.AvgTxValue != 2.0 {
		t.Errorf("AvgTxValue = %f, want 2.0", wc.AvgTxValue)
	}

	if wc.Chain != "ethereum" {
		t.Errorf("Chain = %q, want 'ethereum'", wc.Chain)
	}

	if wc.Address != "0xabc" {
		t.Errorf("Address = %q, want '0xabc'", wc.Address)
	}

	if wc.DataSource != "etherscan" {
		t.Errorf("DataSource = %q, want 'etherscan'", wc.DataSource)
	}
}

func TestNormalize_MixerDetection(t *testing.T) {
	raw := &model.RawWalletData{
		Chain:   "ethereum",
		Address: "0xabc",
		Transactions: []model.RawTransaction{
			{
				Hash:  "0x1",
				From:  "0xabc",
				To:    "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b", // Tornado Cash
				Value: 10.0,
			},
		},
		FirstTxTime: time.Now().AddDate(0, -6, 0),
		DataSource:  "etherscan",
	}

	wc := Normalize(raw)

	if !wc.HasMixerInteraction {
		t.Error("expected HasMixerInteraction to be true")
	}

	found := false
	for _, f := range wc.RiskFlags {
		if f == "mixer_interaction" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected 'mixer_interaction' in RiskFlags, got %v", wc.RiskFlags)
	}
}

func TestNormalize_SanctionedDetection(t *testing.T) {
	raw := &model.RawWalletData{
		Chain:   "ethereum",
		Address: "0xabc",
		Transactions: []model.RawTransaction{
			{
				Hash:  "0x1",
				From:  "0x8589427373d6d84e98730d7795d8f6f8731fda16", // Sanctioned
				To:    "0xabc",
				Value: 5.0,
			},
		},
		FirstTxTime: time.Now().AddDate(-1, 0, 0),
		DataSource:  "etherscan",
	}

	wc := Normalize(raw)

	if !wc.HasSanctionedInteraction {
		t.Error("expected HasSanctionedInteraction to be true")
	}
}

func TestNormalize_TokenDiversity(t *testing.T) {
	raw := &model.RawWalletData{
		Chain:   "ethereum",
		Address: "0xabc",
		Transactions: []model.RawTransaction{
			{Hash: "0x1", From: "0xabc", To: "0xdef", Value: 1.0, IsTokenTransfer: true, TokenSymbol: "USDC"},
			{Hash: "0x2", From: "0xabc", To: "0xdef", Value: 1.0, IsTokenTransfer: true, TokenSymbol: "USDT"},
			{Hash: "0x3", From: "0xabc", To: "0xdef", Value: 1.0, IsTokenTransfer: true, TokenSymbol: "USDC"},
		},
		FirstTxTime: time.Now().AddDate(-1, 0, 0),
		DataSource:  "etherscan",
	}

	wc := Normalize(raw)

	if wc.TokenDiversity != 2 {
		t.Errorf("TokenDiversity = %d, want 2", wc.TokenDiversity)
	}
}

func TestNormalize_DefiInteractions(t *testing.T) {
	raw := &model.RawWalletData{
		Chain:   "ethereum",
		Address: "0xabc",
		Transactions: []model.RawTransaction{
			{
				Hash:  "0x1",
				From:  "0xabc",
				To:    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d", // Uniswap V2
				Value: 1.0,
			},
			{
				Hash:  "0x2",
				From:  "0xabc",
				To:    "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap V3
				Value: 2.0,
			},
		},
		FirstTxTime: time.Now().AddDate(-1, 0, 0),
		DataSource:  "etherscan",
	}

	wc := Normalize(raw)

	if wc.DefiInteractions != 2 {
		t.Errorf("DefiInteractions = %d, want 2", wc.DefiInteractions)
	}
}

func TestNormalize_NFTActivity(t *testing.T) {
	raw := &model.RawWalletData{
		Chain:   "ethereum",
		Address: "0xabc",
		Transactions: []model.RawTransaction{
			{Hash: "0x1", From: "0xabc", To: "0xdef", Value: 0.1, IsNFT: true},
		},
		FirstTxTime: time.Now().AddDate(-1, 0, 0),
		DataSource:  "etherscan",
	}

	wc := Normalize(raw)

	if !wc.NftActivity {
		t.Error("expected NftActivity to be true")
	}
}

func TestNormalize_EmptyTransactions(t *testing.T) {
	raw := &model.RawWalletData{
		Chain:        "ethereum",
		Address:      "0xabc",
		Transactions: nil,
		DataSource:   "etherscan",
	}

	wc := Normalize(raw)

	if wc.TxCount != 0 {
		t.Errorf("TxCount = %d, want 0", wc.TxCount)
	}

	if wc.TotalVolume != 0 {
		t.Errorf("TotalVolume = %f, want 0", wc.TotalVolume)
	}

	found := false
	for _, f := range wc.RiskFlags {
		if f == "no_transaction_history" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected 'no_transaction_history' in RiskFlags, got %v", wc.RiskFlags)
	}
}

func TestNormalize_NewWalletHighActivity(t *testing.T) {
	now := time.Now().UTC()
	tenDaysAgo := now.AddDate(0, 0, -10)

	txs := make([]model.RawTransaction, 60)
	for i := range txs {
		txs[i] = model.RawTransaction{
			Hash:      "0x" + string(rune(i)),
			From:      "0xabc",
			To:        "0xdef",
			Value:     0.01,
			Timestamp: tenDaysAgo,
		}
	}

	raw := &model.RawWalletData{
		Chain:        "ethereum",
		Address:      "0xabc",
		Transactions: txs,
		FirstTxTime:  tenDaysAgo,
		DataSource:   "etherscan",
	}

	wc := Normalize(raw)

	found := false
	for _, f := range wc.RiskFlags {
		if f == "new_wallet_high_activity" {
			found = true
		}
	}
	if !found {
		t.Errorf("expected 'new_wallet_high_activity' in RiskFlags, got %v", wc.RiskFlags)
	}
}

func TestBuildRiskFlags_EmptyWhenClean(t *testing.T) {
	flags := buildRiskFlags(false, false, 10, 365, 0.3, 5.0)
	if len(flags) != 0 {
		t.Errorf("expected no risk flags for clean wallet, got %v", flags)
	}
}
