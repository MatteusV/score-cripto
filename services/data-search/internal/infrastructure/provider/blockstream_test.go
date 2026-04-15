package provider

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestBlockstreamProvider_SupportedChains(t *testing.T) {
	t.Parallel()
	p := NewBlockstreamProvider("https://blockstream.info/api")
	chains := p.SupportedChains()
	if len(chains) != 1 || chains[0] != "bitcoin" {
		t.Fatalf("expected [bitcoin], got %v", chains)
	}
}

func TestBlockstreamProvider_UnsupportedChain(t *testing.T) {
	t.Parallel()
	p := NewBlockstreamProvider("https://blockstream.info/api")
	_, err := p.FetchWalletData(context.Background(), "ethereum", "0xabc")
	if err == nil {
		t.Fatal("expected error for unsupported chain, got nil")
	}
}

func TestBlockstreamProvider_FetchWalletData(t *testing.T) {
	t.Parallel()

	const address = "1BoatSLRHtKNngkdXEeobR76b53LETtpyT"

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.URL.Path {
		case "/address/" + address:
			_ = json.NewEncoder(w).Encode(map[string]interface{}{
				"address": address,
				"chain_stats": map[string]interface{}{
					"funded_txo_count": 3,
					"funded_txo_sum":   300000000,
					"spent_txo_count":  1,
					"spent_txo_sum":    100000000,
					"tx_count":         3,
				},
			})
		case "/address/" + address + "/txs":
			_ = json.NewEncoder(w).Encode([]map[string]interface{}{
				{
					"txid": "abc123",
					"vin": []map[string]interface{}{
						{"prevout": map[string]interface{}{"scriptpubkey_address": "1Sender", "value": 200000000}},
					},
					"vout": []map[string]interface{}{
						{"scriptpubkey_address": address, "value": 100000000},
					},
					"status": map[string]interface{}{
						"confirmed":  true,
						"block_time": 1700000000,
					},
				},
			})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	p := NewBlockstreamProvider(server.URL)
	data, err := p.FetchWalletData(context.Background(), "bitcoin", address)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if data.Chain != "bitcoin" {
		t.Errorf("expected chain=bitcoin, got %s", data.Chain)
	}
	if data.DataSource != "blockstream" {
		t.Errorf("expected dataSource=blockstream, got %s", data.DataSource)
	}
	// balance = (300000000 - 100000000) / 1e8 = 2 BTC
	if data.Balance != 2.0 {
		t.Errorf("expected balance=2.0 BTC, got %f", data.Balance)
	}
	if len(data.Transactions) != 1 {
		t.Fatalf("expected 1 transaction, got %d", len(data.Transactions))
	}
	tx := data.Transactions[0]
	if tx.Hash != "abc123" {
		t.Errorf("expected hash=abc123, got %s", tx.Hash)
	}
	if tx.To != address {
		t.Errorf("expected to=%s, got %s", address, tx.To)
	}
	// value = 100000000 / 1e8 = 1 BTC
	if tx.Value != 1.0 {
		t.Errorf("expected value=1.0 BTC, got %f", tx.Value)
	}
	if tx.Timestamp.Unix() != 1700000000 {
		t.Errorf("expected timestamp=1700000000, got %d", tx.Timestamp.Unix())
	}
}

func TestBlockstreamProvider_404ReturnsError(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.NotFound(w, nil)
	}))
	defer server.Close()

	p := NewBlockstreamProvider(server.URL)
	_, err := p.FetchWalletData(context.Background(), "bitcoin", "badaddress")
	if err == nil {
		t.Fatal("expected error for 404, got nil")
	}
}
