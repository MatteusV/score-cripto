package provider

import (
	"testing"
	"time"

	"github.com/score-cripto/data-search/internal/domain"
)

func TestNormalizeAddress_EthereumCompatibleChains(t *testing.T) {
	got := NormalizeAddress(" ethereum ", " 0xAbC123 ")
	if got != "0xabc123" {
		t.Fatalf("expected normalized ethereum address, got %q", got)
	}
}

func TestNormalizeAddress_PreservesBitcoinCase(t *testing.T) {
	got := NormalizeAddress("bitcoin", " 1BoatSLRHtKNngkdXEeobR76b53LETtpyT ")
	if got != "1BoatSLRHtKNngkdXEeobR76b53LETtpyT" {
		t.Fatalf("expected bitcoin address to be preserved, got %q", got)
	}
}

func TestNormalize_BuildsDerivedMetricsAndRiskFlags(t *testing.T) {
	now := time.Now().UTC()
	raw := &domain.RawWalletData{
		Chain:   "ethereum",
		Address: "0xABCDEF",
		Transactions: []domain.RawTransaction{
			{
				Hash:      "tx-1",
				From:      "0xd90e2f925da726b50c4ed8d0fb90ad053324f31b",
				To:        "0xabcdef",
				Value:     8,
				Timestamp: now.AddDate(0, 0, -5),
			},
			{
				Hash:            "tx-2",
				From:            "0xabcdef",
				To:              "0x7a250d5630b4cf539739df2c5dacb4c659f2488d",
				Value:           2,
				Timestamp:       now.AddDate(0, 0, -2),
				IsTokenTransfer: true,
				TokenSymbol:     "USDC",
				ContractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
			},
		},
		FirstTxTime: now.AddDate(-1, 0, 0),
		LastTxTime:  now.AddDate(0, 0, -2),
		DataSource:  "etherscan",
	}

	wc := Normalize(raw)

	if wc.Chain != "ethereum" {
		t.Fatalf("expected chain ethereum, got %q", wc.Chain)
	}
	if wc.Address != "0xabcdef" {
		t.Fatalf("expected lowercased address, got %q", wc.Address)
	}
	if wc.TxCount != 2 {
		t.Fatalf("expected tx count 2, got %d", wc.TxCount)
	}
	if wc.TotalVolume != 10 {
		t.Fatalf("expected total volume 10, got %v", wc.TotalVolume)
	}
	if wc.UniqueCounterparties != 2 {
		t.Fatalf("expected 2 counterparties, got %d", wc.UniqueCounterparties)
	}
	if wc.LargestTxRatio != 0.8 {
		t.Fatalf("expected largest tx ratio 0.8, got %v", wc.LargestTxRatio)
	}
	if wc.AvgTxValue != 5 {
		t.Fatalf("expected avg tx value 5, got %v", wc.AvgTxValue)
	}
	if !wc.HasMixerInteraction {
		t.Fatal("expected mixer interaction to be detected")
	}
	if wc.HasSanctionedInteraction {
		t.Fatal("did not expect sanctioned interaction")
	}
	if wc.TokenDiversity != 1 {
		t.Fatalf("expected token diversity 1, got %d", wc.TokenDiversity)
	}
	if wc.DefiInteractions != 1 {
		t.Fatalf("expected defi interactions 1, got %d", wc.DefiInteractions)
	}
	if len(wc.RiskFlags) != 1 || wc.RiskFlags[0] != "mixer_interaction" {
		t.Fatalf("expected only mixer_interaction risk flag, got %#v", wc.RiskFlags)
	}
	if wc.DataSource != "etherscan" {
		t.Fatalf("expected data source etherscan, got %q", wc.DataSource)
	}
	if wc.FetchedAt == "" {
		t.Fatal("expected fetchedAt to be populated")
	}
}
