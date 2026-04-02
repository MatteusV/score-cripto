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
				TokenStandard:   "erc20",
				ContractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
			},
		},
		InternalTransactions: []domain.RawTransaction{
			{
				Hash:       "tx-3",
				From:       "0xabcdef",
				To:         "0x9999999999999999999999999999999999999999",
				Value:      1,
				Timestamp:  now.AddDate(0, 0, -1),
				IsInternal: true,
			},
		},
		NFTTransfers: []domain.RawTransaction{
			{
				Hash:            "tx-4",
				From:            "0xabcdef",
				To:              "0x1234567890abcdef1234567890abcdef12345678",
				Timestamp:       now.AddDate(0, 0, -1),
				IsNFT:           true,
				TokenID:         "42",
				TokenSymbol:     "NFT",
				TokenName:       "Test NFT",
				ContractAddress: "0x1111111111111111111111111111111111111111",
				TokenStandard:   "erc721",
			},
		},
		ERC1155Transfers: []domain.RawTransaction{
			{
				Hash:            "tx-5",
				From:            "0xabcdef",
				To:              "0x2222222222222222222222222222222222222222",
				Timestamp:       now.AddDate(0, 0, -1),
				IsERC1155:       true,
				TokenID:         "7",
				TokenSymbol:     "GAME",
				TokenName:       "Game Items",
				ContractAddress: "0x3333333333333333333333333333333333333333",
				TokenStandard:   "erc1155",
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
	if wc.TxCount != 5 {
		t.Fatalf("expected tx count 5, got %d", wc.TxCount)
	}
	if wc.InternalTxCount != 1 {
		t.Fatalf("expected internal tx count 1, got %d", wc.InternalTxCount)
	}
	if wc.TotalVolume != 11 {
		t.Fatalf("expected total volume 11, got %v", wc.TotalVolume)
	}
	if wc.UniqueCounterparties != 5 {
		t.Fatalf("expected 5 counterparties, got %d", wc.UniqueCounterparties)
	}
	if wc.LargestTxRatio != 0.7273 {
		t.Fatalf("expected largest tx ratio 0.7273, got %v", wc.LargestTxRatio)
	}
	if wc.AvgTxValue != 2.2 {
		t.Fatalf("expected avg tx value 2.2, got %v", wc.AvgTxValue)
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
	if !wc.NftActivity {
		t.Fatal("expected nft activity to be detected")
	}
	if wc.NftTransferCount != 1 {
		t.Fatalf("expected nft transfer count 1, got %d", wc.NftTransferCount)
	}
	if wc.NftCollectionCount != 1 {
		t.Fatalf("expected nft collection count 1, got %d", wc.NftCollectionCount)
	}
	if wc.Erc1155TransferCount != 1 {
		t.Fatalf("expected erc1155 transfer count 1, got %d", wc.Erc1155TransferCount)
	}
	if wc.Erc1155CollectionCount != 1 {
		t.Fatalf("expected erc1155 collection count 1, got %d", wc.Erc1155CollectionCount)
	}
	if wc.DefiInteractions != 1 {
		t.Fatalf("expected defi interactions 1, got %d", wc.DefiInteractions)
	}
	if len(wc.ProtocolInteractions) != 3 {
		t.Fatalf("expected 3 protocol interactions, got %#v", wc.ProtocolInteractions)
	}
	if wc.ProtocolInteractions[0] != "dex" || wc.ProtocolInteractions[1] != "nft" || wc.ProtocolInteractions[2] != "mixer" {
		t.Fatalf("unexpected protocol interactions order %#v", wc.ProtocolInteractions)
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
