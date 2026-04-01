package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/score-cripto/data-search/internal/domain"
)

// EtherscanProvider implements BlockchainProviderPort for Ethereum-compatible chains.
type EtherscanProvider struct {
	apiKey     string
	httpClient *http.Client

	// Rate limiter: 5 requests per second for the free tier.
	mu          sync.Mutex
	lastRequest time.Time
	minInterval time.Duration
}

// NewEtherscanProvider creates a provider configured with the given API key.
func NewEtherscanProvider(apiKey string) *EtherscanProvider {
	return &EtherscanProvider{
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		minInterval: 210 * time.Millisecond, // ~4.7 req/s, safe margin under 5/s
	}
}

// SupportedChains returns the chains this provider handles.
func (p *EtherscanProvider) SupportedChains() []string {
	return []string{"ethereum", "polygon"}
}

// baseURL returns the API endpoint for the given chain.
func baseURL(chain string) string {
	switch strings.ToLower(chain) {
	case "polygon":
		return "https://api.polygonscan.com/api"
	default:
		return "https://api.etherscan.io/api"
	}
}

// FetchWalletData retrieves raw on-chain data for the given chain and address.
func (p *EtherscanProvider) FetchWalletData(ctx context.Context, chain, address string) (*domain.RawWalletData, error) {
	base := baseURL(chain)

	txs, err := p.fetchTransactions(ctx, base, address)
	if err != nil {
		return nil, fmt.Errorf("fetch transactions: %w", err)
	}

	tokenTxs, err := p.fetchTokenTransfers(ctx, base, address)
	if err != nil {
		slog.Warn("failed to fetch token transfers, continuing without them", "error", err)
		tokenTxs = nil
	}

	balance, err := p.fetchBalance(ctx, base, address)
	if err != nil {
		slog.Warn("failed to fetch balance, continuing with 0", "error", err)
		balance = 0
	}

	allTxs := append(txs, tokenTxs...)

	var firstTx, lastTx time.Time
	for _, tx := range allTxs {
		if firstTx.IsZero() || tx.Timestamp.Before(firstTx) {
			firstTx = tx.Timestamp
		}
		if lastTx.IsZero() || tx.Timestamp.After(lastTx) {
			lastTx = tx.Timestamp
		}
	}

	holdingsMap := map[string]domain.TokenHolding{}
	for _, tx := range tokenTxs {
		if tx.IsTokenTransfer && tx.TokenSymbol != "" {
			holdingsMap[tx.ContractAddress] = domain.TokenHolding{
				ContractAddress: tx.ContractAddress,
				Symbol:          tx.TokenSymbol,
			}
		}
	}
	holdings := make([]domain.TokenHolding, 0, len(holdingsMap))
	for _, h := range holdingsMap {
		holdings = append(holdings, h)
	}

	return &domain.RawWalletData{
		Chain:         chain,
		Address:       strings.ToLower(address),
		Transactions:  allTxs,
		Balance:       balance,
		TokenHoldings: holdings,
		FirstTxTime:   firstTx,
		LastTxTime:    lastTx,
		DataSource:    "etherscan",
	}, nil
}

// rateLimit enforces the request cadence.
func (p *EtherscanProvider) rateLimit() {
	p.mu.Lock()
	defer p.mu.Unlock()

	elapsed := time.Since(p.lastRequest)
	if elapsed < p.minInterval {
		time.Sleep(p.minInterval - elapsed)
	}
	p.lastRequest = time.Now()
}

// doRequest performs an HTTP GET with rate limiting and retry on 429/5xx.
func (p *EtherscanProvider) doRequest(ctx context.Context, url string) ([]byte, error) {
	const maxRetries = 3

	for attempt := 0; attempt < maxRetries; attempt++ {
		p.rateLimit()

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, err
		}

		resp, err := p.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("http request: %w", err)
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("read body: %w", err)
		}

		if resp.StatusCode == http.StatusTooManyRequests || resp.StatusCode >= 500 {
			backoff := time.Duration(math.Pow(2, float64(attempt))) * time.Second
			slog.Warn("retrying request", "status", resp.StatusCode, "attempt", attempt+1, "backoff", backoff)
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(backoff):
				continue
			}
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
		}

		return body, nil
	}

	return nil, fmt.Errorf("max retries exceeded")
}

// etherscanResponse is the common wrapper for Etherscan API responses.
type etherscanResponse struct {
	Status  string          `json:"status"`
	Message string          `json:"message"`
	Result  json.RawMessage `json:"result"`
}

type etherscanTx struct {
	Hash            string `json:"hash"`
	From            string `json:"from"`
	To              string `json:"to"`
	Value           string `json:"value"`
	TimeStamp       string `json:"timeStamp"`
	ContractAddress string `json:"contractAddress"`
}

type etherscanTokenTx struct {
	Hash            string `json:"hash"`
	From            string `json:"from"`
	To              string `json:"to"`
	Value           string `json:"value"`
	TimeStamp       string `json:"timeStamp"`
	TokenSymbol     string `json:"tokenSymbol"`
	TokenName       string `json:"tokenName"`
	ContractAddress string `json:"contractAddress"`
}

func (p *EtherscanProvider) fetchTransactions(ctx context.Context, base, address string) ([]domain.RawTransaction, error) {
	url := fmt.Sprintf(
		"%s?module=account&action=txlist&address=%s&startblock=0&endblock=99999999&sort=asc&apikey=%s",
		base, address, p.apiKey,
	)

	body, err := p.doRequest(ctx, url)
	if err != nil {
		return nil, err
	}

	var resp etherscanResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("json decode: %w", err)
	}

	if resp.Status == "0" {
		if strings.Contains(resp.Message, "No transactions found") || resp.Message == "NOTOK" {
			return nil, nil
		}
	}

	var rawTxs []etherscanTx
	if err := json.Unmarshal(resp.Result, &rawTxs); err != nil {
		return nil, fmt.Errorf("json decode txlist: %w", err)
	}

	txs := make([]domain.RawTransaction, 0, len(rawTxs))
	for _, rt := range rawTxs {
		txs = append(txs, domain.RawTransaction{
			Hash:            rt.Hash,
			From:            strings.ToLower(rt.From),
			To:              strings.ToLower(rt.To),
			Value:           weiToEth(rt.Value),
			Timestamp:       unixToTime(rt.TimeStamp),
			IsTokenTransfer: false,
			ContractAddress: strings.ToLower(rt.ContractAddress),
		})
	}

	return txs, nil
}

func (p *EtherscanProvider) fetchTokenTransfers(ctx context.Context, base, address string) ([]domain.RawTransaction, error) {
	url := fmt.Sprintf(
		"%s?module=account&action=tokentx&address=%s&startblock=0&endblock=99999999&sort=asc&apikey=%s",
		base, address, p.apiKey,
	)

	body, err := p.doRequest(ctx, url)
	if err != nil {
		return nil, err
	}

	var resp etherscanResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("json decode: %w", err)
	}

	if resp.Status == "0" {
		return nil, nil
	}

	var rawTxs []etherscanTokenTx
	if err := json.Unmarshal(resp.Result, &rawTxs); err != nil {
		return nil, fmt.Errorf("json decode tokentx: %w", err)
	}

	txs := make([]domain.RawTransaction, 0, len(rawTxs))
	for _, rt := range rawTxs {
		txs = append(txs, domain.RawTransaction{
			Hash:            rt.Hash,
			From:            strings.ToLower(rt.From),
			To:              strings.ToLower(rt.To),
			Value:           weiToEth(rt.Value),
			Timestamp:       unixToTime(rt.TimeStamp),
			IsTokenTransfer: true,
			TokenSymbol:     rt.TokenSymbol,
			ContractAddress: strings.ToLower(rt.ContractAddress),
		})
	}

	return txs, nil
}

func (p *EtherscanProvider) fetchBalance(ctx context.Context, base, address string) (float64, error) {
	url := fmt.Sprintf(
		"%s?module=account&action=balance&address=%s&tag=latest&apikey=%s",
		base, address, p.apiKey,
	)

	body, err := p.doRequest(ctx, url)
	if err != nil {
		return 0, err
	}

	var resp etherscanResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return 0, fmt.Errorf("json decode: %w", err)
	}

	var balanceStr string
	if err := json.Unmarshal(resp.Result, &balanceStr); err != nil {
		return 0, fmt.Errorf("json decode balance: %w", err)
	}

	return weiToEth(balanceStr), nil
}

// weiToEth converts a Wei string value to ETH as float64.
func weiToEth(weiStr string) float64 {
	wei, err := strconv.ParseFloat(weiStr, 64)
	if err != nil {
		return 0
	}
	return wei / 1e18
}

// unixToTime converts a Unix timestamp string to time.Time.
func unixToTime(ts string) time.Time {
	sec, err := strconv.ParseInt(ts, 10, 64)
	if err != nil {
		return time.Time{}
	}
	return time.Unix(sec, 0)
}
