package provider

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestEtherscanProvider_FetchWalletData_UsesBaseURLOverride(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("chainid"); got != "1" {
			http.Error(w, "missing or invalid chainid", http.StatusBadRequest)
			return
		}
		action := r.URL.Query().Get("action")
		w.Header().Set("Content-Type", "application/json")

		switch action {
		case "txlist":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "1",
				"message": "OK",
				"result": []map[string]string{
					{
						"hash":      "0xhash1",
						"from":      "0xaaa",
						"to":        "0xbbb",
						"value":     "1000000000000000000",
						"timeStamp": "1704067200",
					},
				},
			})
		case "tokentx":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "1",
				"message": "OK",
				"result": []map[string]string{
					{
						"hash":            "0xhash2",
						"from":            "0xbbb",
						"to":              "0xccc",
						"value":           "500000000000000000",
						"timeStamp":       "1706745600",
						"tokenSymbol":     "USDC",
						"tokenName":       "USD Coin",
						"contractAddress": "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
					},
				},
			})
		case "txlistinternal":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "1",
				"message": "OK",
				"result": []map[string]string{
					{
						"hash":      "0xhash3",
						"from":      "0xccc",
						"to":        "0xddd",
						"value":     "250000000000000000",
						"timeStamp": "1709251200",
					},
				},
			})
		case "tokennfttx":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "1",
				"message": "OK",
				"result": []map[string]string{
					{
						"hash":            "0xhash4",
						"from":            "0xddd",
						"to":              "0xeee",
						"timeStamp":       "1709337600",
						"tokenID":         "42",
						"tokenSymbol":     "NFT",
						"tokenName":       "Test NFT",
						"contractAddress": "0x1111111111111111111111111111111111111111",
					},
				},
			})
		case "token1155tx":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "1",
				"message": "OK",
				"result": []map[string]string{
					{
						"hash":            "0xhash5",
						"from":            "0xeee",
						"to":              "0xfff",
						"timeStamp":       "1709424000",
						"tokenID":         "7",
						"tokenValue":      "3",
						"tokenSymbol":     "GAME",
						"tokenName":       "Game Items",
						"contractAddress": "0x2222222222222222222222222222222222222222",
					},
				},
			})
		case "balance":
			_ = json.NewEncoder(w).Encode(map[string]any{
				"status":  "1",
				"message": "OK",
				"result":  "1500000000000000000",
			})
		default:
			http.Error(w, "unexpected action", http.StatusBadRequest)
		}
	}))
	defer server.Close()

	provider := NewEtherscanProvider("", server.URL+"/v2/api")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	raw, err := provider.FetchWalletData(ctx, "ethereum", "0xAbC123")
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if raw.Address != "0xabc123" {
		t.Fatalf("expected normalized address, got %q", raw.Address)
	}
	if raw.Balance != 1.5 {
		t.Fatalf("expected balance 1.5, got %v", raw.Balance)
	}
	if len(raw.Transactions) != 5 {
		t.Fatalf("expected 5 transactions, got %d", len(raw.Transactions))
	}
	if len(raw.InternalTransactions) != 1 {
		t.Fatalf("expected 1 internal transaction, got %d", len(raw.InternalTransactions))
	}
	if len(raw.NFTTransfers) != 1 {
		t.Fatalf("expected 1 nft transfer, got %d", len(raw.NFTTransfers))
	}
	if len(raw.ERC1155Transfers) != 1 {
		t.Fatalf("expected 1 erc1155 transfer, got %d", len(raw.ERC1155Transfers))
	}
	if len(raw.TokenHoldings) != 1 {
		t.Fatalf("expected 1 token holding, got %d", len(raw.TokenHoldings))
	}
	if raw.TokenHoldings[0].Symbol != "USDC" {
		t.Fatalf("expected USDC token holding, got %q", raw.TokenHoldings[0].Symbol)
	}
	if raw.FirstTxTime.IsZero() || raw.LastTxTime.IsZero() {
		t.Fatal("expected first and last tx times to be populated")
	}
	if raw.DataSource != "etherscan" {
		t.Fatalf("expected data source etherscan, got %q", raw.DataSource)
	}
}
