package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/score-cripto/data-search/internal/domain"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// EtherscanProvider implements BlockchainProviderPort for Ethereum-compatible chains.
type EtherscanProvider struct {
	apiKey          string
	baseURLOverride string
	httpClient      *http.Client

	// Rate limiter: 5 requests per second for the free tier.
	mu          sync.Mutex
	lastRequest time.Time
	minInterval time.Duration
}

var etherscanChainIDs = map[string]string{
	"ethereum":  "1",
	"polygon":   "137",
	"arbitrum":  "42161",
	"optimism":  "10",
	"base":      "8453",
	"avalanche": "43114",
	"bsc":       "56",
}

// NewEtherscanProvider creates a provider configured with the given API key.
func NewEtherscanProvider(apiKey string, baseURLOverride string) *EtherscanProvider {
	return &EtherscanProvider{
		apiKey:          apiKey,
		baseURLOverride: strings.TrimRight(baseURLOverride, "/"),
		httpClient: &http.Client{
			Transport: otelhttp.NewTransport(http.DefaultTransport),
			Timeout:   30 * time.Second,
		},
		minInterval: 210 * time.Millisecond, // ~4.7 req/s, safe margin under 5/s
	}
}

// SupportedChains returns the chains this provider handles.
func (p *EtherscanProvider) SupportedChains() []string {
	chains := make([]string, 0, len(etherscanChainIDs))
	for chain := range etherscanChainIDs {
		chains = append(chains, chain)
	}
	return chains
}

// apiBase returns the API base endpoint (V2).
func (p *EtherscanProvider) apiBase() string {
	if p.baseURLOverride != "" {
		return p.baseURLOverride
	}
	return "https://api.etherscan.io/v2/api"
}

func (p *EtherscanProvider) chainID(chain string) (string, bool) {
	id, ok := etherscanChainIDs[strings.ToLower(chain)]
	return id, ok
}

// FetchWalletData retrieves raw on-chain data for the given chain and address.
func (p *EtherscanProvider) FetchWalletData(ctx context.Context, chain, address string) (*domain.RawWalletData, error) {
	chainID, ok := p.chainID(chain)
	if !ok {
		return nil, fmt.Errorf("unsupported chain: %s", chain)
	}
	base := p.apiBase()

	txs, err := p.fetchTransactions(ctx, base, chainID, address)
	if err != nil {
		return nil, fmt.Errorf("fetch transactions: %w", err)
	}

	internalTxs, err := p.fetchInternalTransactions(ctx, base, chainID, address)
	if err != nil {
		slog.Warn("failed to fetch internal transactions, continuing without them", "error", err)
		internalTxs = nil
	}

	tokenTxs, err := p.fetchTokenTransfers(ctx, base, chainID, address)
	if err != nil {
		slog.Warn("failed to fetch token transfers, continuing without them", "error", err)
		tokenTxs = nil
	}

	nftTxs, err := p.fetchNFTTransfers(ctx, base, chainID, address)
	if err != nil {
		slog.Warn("failed to fetch nft transfers, continuing without them", "error", err)
		nftTxs = nil
	}

	erc1155Txs, err := p.fetchERC1155Transfers(ctx, base, chainID, address)
	if err != nil {
		slog.Warn("failed to fetch erc1155 transfers, continuing without them", "error", err)
		erc1155Txs = nil
	}

	balance, err := p.fetchBalance(ctx, base, chainID, address)
	if err != nil {
		slog.Warn("failed to fetch balance, continuing with 0", "error", err)
		balance = 0
	}

	allTxs := append(txs, tokenTxs...)
	allTxs = append(allTxs, internalTxs...)
	allTxs = append(allTxs, nftTxs...)
	allTxs = append(allTxs, erc1155Txs...)

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
		Chain:                chain,
		Address:              strings.ToLower(address),
		Transactions:         allTxs,
		InternalTransactions: internalTxs,
		NFTTransfers:         nftTxs,
		ERC1155Transfers:     erc1155Txs,
		Balance:              balance,
		TokenHoldings:        holdings,
		FirstTxTime:          firstTx,
		LastTxTime:           lastTx,
		DataSource:           "etherscan",
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

type etherscanInternalTx struct {
	Hash      string `json:"hash"`
	From      string `json:"from"`
	To        string `json:"to"`
	Value     string `json:"value"`
	TimeStamp string `json:"timeStamp"`
}

type etherscanNftTx struct {
	Hash            string `json:"hash"`
	From            string `json:"from"`
	To              string `json:"to"`
	TimeStamp       string `json:"timeStamp"`
	TokenID         string `json:"tokenID"`
	TokenSymbol     string `json:"tokenSymbol"`
	TokenName       string `json:"tokenName"`
	ContractAddress string `json:"contractAddress"`
}

type etherscanERC1155Tx struct {
	Hash            string `json:"hash"`
	From            string `json:"from"`
	To              string `json:"to"`
	TimeStamp       string `json:"timeStamp"`
	TokenID         string `json:"tokenID"`
	TokenValue      string `json:"tokenValue"`
	TokenSymbol     string `json:"tokenSymbol"`
	TokenName       string `json:"tokenName"`
	ContractAddress string `json:"contractAddress"`
}

func (p *EtherscanProvider) fetchTransactions(ctx context.Context, base, chainID, address string) ([]domain.RawTransaction, error) {
	url, err := p.buildURL(base, chainID, map[string]string{
		"module":     "account",
		"action":     "txlist",
		"address":    address,
		"startblock": "0",
		"endblock":   "99999999",
		"sort":       "asc",
	})
	if err != nil {
		return nil, err
	}

	body, err := p.doRequest(ctx, url)
	if err != nil {
		return nil, err
	}

	var resp etherscanResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("json decode: %w", err)
	}

	if resp.Status == "0" {
		if isNoTransactions(resp) {
			return nil, nil
		}
		return nil, fmt.Errorf("txlist error: %s", responseError(resp))
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
			IsInternal:      false,
			ContractAddress: strings.ToLower(rt.ContractAddress),
			TokenStandard:   "native",
		})
	}

	return txs, nil
}

func (p *EtherscanProvider) fetchTokenTransfers(ctx context.Context, base, chainID, address string) ([]domain.RawTransaction, error) {
	url, err := p.buildURL(base, chainID, map[string]string{
		"module":     "account",
		"action":     "tokentx",
		"address":    address,
		"startblock": "0",
		"endblock":   "99999999",
		"sort":       "asc",
	})
	if err != nil {
		return nil, err
	}

	body, err := p.doRequest(ctx, url)
	if err != nil {
		return nil, err
	}

	var resp etherscanResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("json decode: %w", err)
	}

	if resp.Status == "0" {
		if isNoTransactions(resp) {
			return nil, nil
		}
		return nil, fmt.Errorf("tokentx error: %s", responseError(resp))
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
			TokenName:       rt.TokenName,
			ContractAddress: strings.ToLower(rt.ContractAddress),
			TokenStandard:   "erc20",
		})
	}

	return txs, nil
}

func (p *EtherscanProvider) fetchInternalTransactions(ctx context.Context, base, chainID, address string) ([]domain.RawTransaction, error) {
	url, err := p.buildURL(base, chainID, map[string]string{
		"module":     "account",
		"action":     "txlistinternal",
		"address":    address,
		"startblock": "0",
		"endblock":   "99999999",
		"sort":       "asc",
	})
	if err != nil {
		return nil, err
	}

	body, err := p.doRequest(ctx, url)
	if err != nil {
		return nil, err
	}

	var resp etherscanResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("json decode: %w", err)
	}

	if resp.Status == "0" {
		if strings.Contains(resp.Message, "No transactions found") {
			return nil, nil
		}
		return nil, fmt.Errorf("internal tx error: %s", resp.Message)
	}

	var rawTxs []etherscanInternalTx
	if err := json.Unmarshal(resp.Result, &rawTxs); err != nil {
		return nil, fmt.Errorf("json decode txlistinternal: %w", err)
	}

	txs := make([]domain.RawTransaction, 0, len(rawTxs))
	for _, rt := range rawTxs {
		txs = append(txs, domain.RawTransaction{
			Hash:          rt.Hash,
			From:          strings.ToLower(rt.From),
			To:            strings.ToLower(rt.To),
			Value:         weiToEth(rt.Value),
			Timestamp:     unixToTime(rt.TimeStamp),
			IsInternal:    true,
			TokenStandard: "internal",
		})
	}

	return txs, nil
}

func (p *EtherscanProvider) fetchNFTTransfers(ctx context.Context, base, chainID, address string) ([]domain.RawTransaction, error) {
	url, err := p.buildURL(base, chainID, map[string]string{
		"module":  "account",
		"action":  "tokennfttx",
		"address": address,
		"page":    "1",
		"offset":  "100",
		"sort":    "asc",
	})
	if err != nil {
		return nil, err
	}

	body, err := p.doRequest(ctx, url)
	if err != nil {
		return nil, err
	}

	var resp etherscanResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("json decode: %w", err)
	}

	if resp.Status == "0" {
		if strings.Contains(resp.Message, "No transactions found") {
			return nil, nil
		}
		return nil, fmt.Errorf("tokennfttx error: %s", resp.Message)
	}

	var rawTxs []etherscanNftTx
	if err := json.Unmarshal(resp.Result, &rawTxs); err != nil {
		return nil, fmt.Errorf("json decode tokennfttx: %w", err)
	}

	txs := make([]domain.RawTransaction, 0, len(rawTxs))
	for _, rt := range rawTxs {
		txs = append(txs, domain.RawTransaction{
			Hash:            rt.Hash,
			From:            strings.ToLower(rt.From),
			To:              strings.ToLower(rt.To),
			Timestamp:       unixToTime(rt.TimeStamp),
			IsNFT:           true,
			TokenSymbol:     rt.TokenSymbol,
			TokenName:       rt.TokenName,
			TokenID:         rt.TokenID,
			ContractAddress: strings.ToLower(rt.ContractAddress),
			TokenStandard:   "erc721",
		})
	}

	return txs, nil
}

func (p *EtherscanProvider) fetchERC1155Transfers(ctx context.Context, base, chainID, address string) ([]domain.RawTransaction, error) {
	url, err := p.buildURL(base, chainID, map[string]string{
		"module":  "account",
		"action":  "token1155tx",
		"address": address,
		"page":    "1",
		"offset":  "100",
		"sort":    "asc",
	})
	if err != nil {
		return nil, err
	}

	body, err := p.doRequest(ctx, url)
	if err != nil {
		return nil, err
	}

	var resp etherscanResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return nil, fmt.Errorf("json decode: %w", err)
	}

	if resp.Status == "0" {
		if strings.Contains(resp.Message, "No transactions found") {
			return nil, nil
		}
		return nil, fmt.Errorf("token1155tx error: %s", resp.Message)
	}

	var rawTxs []etherscanERC1155Tx
	if err := json.Unmarshal(resp.Result, &rawTxs); err != nil {
		return nil, fmt.Errorf("json decode token1155tx: %w", err)
	}

	txs := make([]domain.RawTransaction, 0, len(rawTxs))
	for _, rt := range rawTxs {
		txs = append(txs, domain.RawTransaction{
			Hash:            rt.Hash,
			From:            strings.ToLower(rt.From),
			To:              strings.ToLower(rt.To),
			Timestamp:       unixToTime(rt.TimeStamp),
			IsERC1155:       true,
			TokenSymbol:     rt.TokenSymbol,
			TokenName:       rt.TokenName,
			TokenID:         rt.TokenID,
			ContractAddress: strings.ToLower(rt.ContractAddress),
			TokenStandard:   "erc1155",
		})
	}

	return txs, nil
}

func (p *EtherscanProvider) fetchBalance(ctx context.Context, base, chainID, address string) (float64, error) {
	url, err := p.buildURL(base, chainID, map[string]string{
		"module":  "account",
		"action":  "balance",
		"address": address,
		"tag":     "latest",
	})
	if err != nil {
		return 0, err
	}

	body, err := p.doRequest(ctx, url)
	if err != nil {
		return 0, err
	}

	var resp etherscanResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		return 0, fmt.Errorf("json decode: %w", err)
	}
	if resp.Status == "0" {
		return 0, fmt.Errorf("balance error: %s", responseError(resp))
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

func (p *EtherscanProvider) buildURL(base, chainID string, params map[string]string) (string, error) {
	parsed, err := url.Parse(base)
	if err != nil {
		return "", fmt.Errorf("parse base url: %w", err)
	}

	query := parsed.Query()
	if query.Get("chainid") == "" && chainID != "" {
		query.Set("chainid", chainID)
	}
	for key, value := range params {
		if value != "" {
			query.Set(key, value)
		}
	}
	if p.apiKey != "" && query.Get("apikey") == "" {
		query.Set("apikey", p.apiKey)
	}

	parsed.RawQuery = query.Encode()
	return parsed.String(), nil
}

func isNoTransactions(resp etherscanResponse) bool {
	if strings.Contains(strings.ToLower(resp.Message), "no transactions found") {
		return true
	}
	var resultMsg string
	if err := json.Unmarshal(resp.Result, &resultMsg); err == nil {
		return strings.Contains(strings.ToLower(resultMsg), "no transactions found")
	}
	return false
}

func responseError(resp etherscanResponse) string {
	msg := strings.TrimSpace(resp.Message)
	var resultMsg string
	if err := json.Unmarshal(resp.Result, &resultMsg); err == nil {
		resultMsg = strings.TrimSpace(resultMsg)
	}
	switch {
	case resultMsg != "" && !strings.Contains(strings.ToLower(resultMsg), "no transactions found"):
		return resultMsg
	case msg != "":
		return msg
	default:
		return "unknown error"
	}
}
