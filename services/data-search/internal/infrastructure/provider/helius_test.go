package provider

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHeliusProvider_SupportedChains(t *testing.T) {
	t.Parallel()
	p := NewHeliusProvider("test-key")
	chains := p.SupportedChains()
	if len(chains) != 1 || chains[0] != "solana" {
		t.Fatalf("expected [solana], got %v", chains)
	}
}

func TestHeliusProvider_UnsupportedChain(t *testing.T) {
	t.Parallel()
	p := NewHeliusProvider("test-key")
	_, err := p.FetchWalletData(context.Background(), "ethereum", "0xabc")
	if err == nil {
		t.Fatal("expected error for unsupported chain, got nil")
	}
}

func TestHeliusProvider_FetchWalletData(t *testing.T) {
	t.Parallel()

	const address = "5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhYrPSqtJNmcD"

	// We can't easily intercept the hardcoded helius URLs in the provider,
	// so we test mapHeliusTransactions directly.
	txs := []heliusTx{
		{
			Signature: "sig1",
			Timestamp: 1700000000,
			FeePayer:  address,
			NativeTransfers: []struct {
				FromUserAccount string `json:"fromUserAccount"`
				ToUserAccount   string `json:"toUserAccount"`
				Amount          int64  `json:"amount"`
			}{
				{FromUserAccount: "sender1", ToUserAccount: address, Amount: 1_000_000_000},
			},
			TokenTransfers: nil,
		},
		{
			Signature: "sig2",
			Timestamp: 1700100000,
			FeePayer:  address,
			NativeTransfers: nil,
			TokenTransfers: []struct {
				FromUserAccount string  `json:"fromUserAccount"`
				ToUserAccount   string  `json:"toUserAccount"`
				TokenAmount     float64 `json:"tokenAmount"`
				Mint            string  `json:"mint"`
				TokenStandard   string  `json:"tokenStandard"`
			}{
				{FromUserAccount: "sender2", ToUserAccount: address, TokenAmount: 10.0, Mint: "TokenMintXYZ", TokenStandard: "Fungible"},
			},
		},
	}

	rawTxs, tokenSymbols, firstTx, lastTx := mapHeliusTransactions(address, txs)

	if len(rawTxs) != 2 {
		t.Fatalf("expected 2 raw transactions, got %d", len(rawTxs))
	}

	// First tx: native SOL transfer
	if rawTxs[0].Hash != "sig1" {
		t.Errorf("expected hash=sig1, got %s", rawTxs[0].Hash)
	}
	if rawTxs[0].Value != 1.0 { // 1e9 lamports = 1 SOL
		t.Errorf("expected value=1.0 SOL, got %f", rawTxs[0].Value)
	}

	// Second tx: token transfer
	if rawTxs[1].Hash != "sig2" {
		t.Errorf("expected hash=sig2, got %s", rawTxs[1].Hash)
	}
	if !rawTxs[1].IsTokenTransfer {
		t.Error("expected IsTokenTransfer=true for fungible token")
	}
	if rawTxs[1].ContractAddress != "TokenMintXYZ" {
		t.Errorf("expected mint=TokenMintXYZ, got %s", rawTxs[1].ContractAddress)
	}

	// Token symbols collected
	if !tokenSymbols["TokenMintXYZ"] {
		t.Error("expected TokenMintXYZ in tokenSymbols")
	}

	// Timestamps
	if firstTx.Unix() != 1700000000 {
		t.Errorf("expected firstTx=1700000000, got %d", firstTx.Unix())
	}
	if lastTx.Unix() != 1700100000 {
		t.Errorf("expected lastTx=1700100000, got %d", lastTx.Unix())
	}
}

func TestHeliusProvider_NFTTransfer(t *testing.T) {
	t.Parallel()

	txs := []heliusTx{
		{
			Signature: "nft-sig",
			Timestamp: 1700000000,
			TokenTransfers: []struct {
				FromUserAccount string  `json:"fromUserAccount"`
				ToUserAccount   string  `json:"toUserAccount"`
				TokenAmount     float64 `json:"tokenAmount"`
				Mint            string  `json:"mint"`
				TokenStandard   string  `json:"tokenStandard"`
			}{
				{Mint: "NFTMint1", TokenStandard: "NonFungible", TokenAmount: 1},
			},
		},
	}

	rawTxs, tokenSymbols, _, _ := mapHeliusTransactions("wallet", txs)

	if len(rawTxs) != 1 {
		t.Fatalf("expected 1 raw tx, got %d", len(rawTxs))
	}
	if !rawTxs[0].IsNFT {
		t.Error("expected IsNFT=true")
	}
	if rawTxs[0].IsTokenTransfer {
		t.Error("expected IsTokenTransfer=false for NFT")
	}
	// NFT mints should NOT be added to tokenSymbols
	if tokenSymbols["NFTMint1"] {
		t.Error("NFT mint should not be added to tokenSymbols")
	}
}

func TestHeliusProvider_EmptyTransactions(t *testing.T) {
	t.Parallel()

	rawTxs, tokenSymbols, firstTx, lastTx := mapHeliusTransactions("wallet", nil)

	if len(rawTxs) != 0 {
		t.Errorf("expected 0 raw txs, got %d", len(rawTxs))
	}
	if len(tokenSymbols) != 0 {
		t.Errorf("expected 0 token symbols, got %d", len(tokenSymbols))
	}
	if !firstTx.IsZero() {
		t.Error("expected zero firstTx")
	}
	if !lastTx.IsZero() {
		t.Error("expected zero lastTx")
	}
}

// TestHeliusProvider_FallbackEntryWhenNoTransfers verifies that a tx with no
// native or token transfers still produces a placeholder RawTransaction.
func TestHeliusProvider_FallbackEntryWhenNoTransfers(t *testing.T) {
	t.Parallel()

	txs := []heliusTx{
		{
			Signature: "empty-sig",
			Timestamp: 1700000000,
			FeePayer:  "payer1",
		},
	}

	rawTxs, _, _, _ := mapHeliusTransactions("wallet", txs)

	if len(rawTxs) != 1 {
		t.Fatalf("expected 1 fallback entry, got %d", len(rawTxs))
	}
	if rawTxs[0].From != "payer1" {
		t.Errorf("expected From=payer1, got %s", rawTxs[0].From)
	}
}

// TestHeliusProvider_RpcBalanceDecoding ensures the balance RPC response is correctly decoded.
func TestHeliusProvider_RpcBalanceDecoding(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.URL.RawQuery, "api-key=testkey") {
			http.Error(w, "missing api key", http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]interface{}{
			"jsonrpc": "2.0",
			"id":      1,
			"result": map[string]interface{}{
				"value":   5_000_000_000, // 5 SOL
				"context": map[string]interface{}{"slot": 123456},
			},
		})
	}))
	defer server.Close()

	// We can't override the helius URL without changing the provider, so we
	// test the decode logic by constructing the response struct directly.
	raw := []byte(`{"jsonrpc":"2.0","id":1,"result":{"value":5000000000}}`)
	var resp heliusBalanceResponse
	if err := json.Unmarshal(raw, &resp); err != nil {
		t.Fatalf("unexpected decode error: %v", err)
	}
	balanceSOL := float64(resp.Result.Value) / lamportsPerSOL
	if balanceSOL != 5.0 {
		t.Errorf("expected 5.0 SOL, got %f", balanceSOL)
	}
}
