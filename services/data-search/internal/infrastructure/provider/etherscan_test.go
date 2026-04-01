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

	provider := NewEtherscanProvider("", server.URL+"/api")
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
	if len(raw.Transactions) != 2 {
		t.Fatalf("expected 2 transactions, got %d", len(raw.Transactions))
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
