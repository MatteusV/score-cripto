package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/score-cripto/data-search/internal/domain"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

const lamportsPerSOL = 1e9

// HeliusProvider fetches Solana wallet data using the Helius Enhanced Transactions API.
// Requires a Helius API key (https://helius.dev/).
type HeliusProvider struct {
	apiKey     string
	httpClient *http.Client
}

func NewHeliusProvider(apiKey string) *HeliusProvider {
	return &HeliusProvider{
		apiKey: apiKey,
		httpClient: &http.Client{
			Transport: otelhttp.NewTransport(http.DefaultTransport),
			Timeout:   30 * time.Second,
		},
	}
}

func (p *HeliusProvider) SupportedChains() []string {
	return []string{"solana"}
}

func (p *HeliusProvider) FetchWalletData(ctx context.Context, chain, address string) (*domain.RawWalletData, error) {
	if strings.ToLower(chain) != "solana" {
		return nil, fmt.Errorf("unsupported chain: %s", chain)
	}

	balance, err := p.fetchBalance(ctx, address)
	if err != nil {
		slog.WarnContext(ctx, "helius: failed to fetch balance", "error", err)
	}

	txs, err := p.fetchTransactions(ctx, address)
	if err != nil {
		slog.WarnContext(ctx, "helius: failed to fetch transactions, continuing with empty list", "error", err)
		txs = nil
	}

	rawTxs, tokenSymbols, firstTx, lastTx := mapHeliusTransactions(address, txs)

	tokenHoldings := make([]domain.TokenHolding, 0, len(tokenSymbols))
	for sym := range tokenSymbols {
		tokenHoldings = append(tokenHoldings, domain.TokenHolding{Symbol: sym})
	}

	return &domain.RawWalletData{
		Chain:                chain,
		Address:              address,
		Transactions:         rawTxs,
		InternalTransactions: []domain.RawTransaction{},
		NFTTransfers:         []domain.RawTransaction{},
		ERC1155Transfers:     []domain.RawTransaction{},
		Balance:              balance,
		TokenHoldings:        tokenHoldings,
		FirstTxTime:          firstTx,
		LastTxTime:           lastTx,
		DataSource:           "helius",
	}, nil
}

// ---- Helius API types ----

type heliusRPCRequest struct {
	Jsonrpc string        `json:"jsonrpc"`
	ID      int           `json:"id"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
}

type heliusBalanceResponse struct {
	Result struct {
		Value int64 `json:"value"` // lamports
	} `json:"result"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

// heliusTx is the shape returned by the Helius Enhanced Transactions API.
type heliusTx struct {
	Signature   string  `json:"signature"`
	Timestamp   int64   `json:"timestamp"`
	Fee         int64   `json:"fee"`
	FeePayer    string  `json:"feePayer"`
	Type        string  `json:"type"`
	Source      string  `json:"source"`
	Description string  `json:"description"`
	NativeTransfers []struct {
		FromUserAccount string `json:"fromUserAccount"`
		ToUserAccount   string `json:"toUserAccount"`
		Amount          int64  `json:"amount"` // lamports
	} `json:"nativeTransfers"`
	TokenTransfers []struct {
		FromUserAccount string  `json:"fromUserAccount"`
		ToUserAccount   string  `json:"toUserAccount"`
		TokenAmount     float64 `json:"tokenAmount"`
		Mint            string  `json:"mint"`
		TokenStandard   string  `json:"tokenStandard"`
	} `json:"tokenTransfers"`
}

// ---- Helpers ----

func (p *HeliusProvider) fetchBalance(ctx context.Context, address string) (float64, error) {
	rpcURL := fmt.Sprintf("https://mainnet.helius-rpc.com/?api-key=%s", p.apiKey)
	reqBody := heliusRPCRequest{
		Jsonrpc: "2.0",
		ID:      1,
		Method:  "getBalance",
		Params:  []interface{}{address},
	}
	body, err := p.post(ctx, rpcURL, reqBody)
	if err != nil {
		return 0, err
	}

	var resp heliusBalanceResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return 0, fmt.Errorf("decode balance: %w", err)
	}
	if resp.Error != nil {
		return 0, fmt.Errorf("rpc error: %s", resp.Error.Message)
	}

	return float64(resp.Result.Value) / lamportsPerSOL, nil
}

func (p *HeliusProvider) fetchTransactions(ctx context.Context, address string) ([]heliusTx, error) {
	url := fmt.Sprintf("https://api.helius.xyz/v0/addresses/%s/transactions?api-key=%s&limit=50", address, p.apiKey)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http get: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("helius returned status %d", resp.StatusCode)
	}

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var txs []heliusTx
	if err := json.Unmarshal(responseBody, &txs); err != nil {
		return nil, fmt.Errorf("decode transactions: %w", err)
	}
	return txs, nil
}

func (p *HeliusProvider) post(ctx context.Context, url string, payload interface{}) ([]byte, error) {
	b, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(b))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http post: %w", err)
	}
	defer resp.Body.Close() //nolint:errcheck

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("rpc returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	return body, nil
}

func mapHeliusTransactions(address string, txs []heliusTx) ([]domain.RawTransaction, map[string]bool, time.Time, time.Time) {
	var rawTxs []domain.RawTransaction
	tokenSymbols := map[string]bool{}
	var firstTx, lastTx time.Time

	for _, tx := range txs {
		ts := time.Time{}
		if tx.Timestamp > 0 {
			ts = time.Unix(tx.Timestamp, 0).UTC()
		}

		if firstTx.IsZero() || (!ts.IsZero() && ts.Before(firstTx)) {
			firstTx = ts
		}
		if lastTx.IsZero() || ts.After(lastTx) {
			lastTx = ts
		}

		// Native SOL transfers
		for _, transfer := range tx.NativeTransfers {
			rawTxs = append(rawTxs, domain.RawTransaction{
				Hash:      tx.Signature,
				From:      transfer.FromUserAccount,
				To:        transfer.ToUserAccount,
				Value:     float64(transfer.Amount) / lamportsPerSOL,
				Timestamp: ts,
			})
		}

		// Token transfers
		for _, transfer := range tx.TokenTransfers {
			isNFT := strings.EqualFold(transfer.TokenStandard, "NonFungible") ||
				strings.EqualFold(transfer.TokenStandard, "NonFungibleEdition")

			if transfer.Mint != "" && !isNFT {
				tokenSymbols[transfer.Mint] = true
			}

			rawTxs = append(rawTxs, domain.RawTransaction{
				Hash:            tx.Signature,
				From:            transfer.FromUserAccount,
				To:              transfer.ToUserAccount,
				Value:           transfer.TokenAmount,
				Timestamp:       ts,
				IsTokenTransfer: !isNFT,
				IsNFT:           isNFT,
				ContractAddress: transfer.Mint,
			})
		}

		// If no transfers recorded yet for this tx, add a placeholder entry
		if len(tx.NativeTransfers) == 0 && len(tx.TokenTransfers) == 0 {
			rawTxs = append(rawTxs, domain.RawTransaction{
				Hash:      tx.Signature,
				From:      tx.FeePayer,
				To:        address,
				Timestamp: ts,
			})
		}
	}

	return rawTxs, tokenSymbols, firstTx, lastTx
}
