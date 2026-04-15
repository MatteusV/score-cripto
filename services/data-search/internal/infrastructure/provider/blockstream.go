package provider

import (
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

const satoshisPerBTC = 1e8

// BlockstreamProvider fetches Bitcoin wallet data from the Blockstream REST API.
// No API key is required — the service is publicly available.
type BlockstreamProvider struct {
	baseURL    string
	httpClient *http.Client
}

func NewBlockstreamProvider(baseURL string) *BlockstreamProvider {
	return &BlockstreamProvider{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Transport: otelhttp.NewTransport(http.DefaultTransport),
			Timeout:   30 * time.Second,
		},
	}
}

func (p *BlockstreamProvider) SupportedChains() []string {
	return []string{"bitcoin"}
}

func (p *BlockstreamProvider) FetchWalletData(ctx context.Context, chain, address string) (*domain.RawWalletData, error) {
	if strings.ToLower(chain) != "bitcoin" {
		return nil, fmt.Errorf("unsupported chain: %s", chain)
	}

	addrInfo, err := p.fetchAddressInfo(ctx, address)
	if err != nil {
		return nil, fmt.Errorf("blockstream address info: %w", err)
	}

	txs, err := p.fetchTransactions(ctx, address)
	if err != nil {
		slog.WarnContext(ctx, "blockstream: failed to fetch transactions, continuing with empty list", "error", err)
		txs = nil
	}

	rawTxs, firstTx, lastTx := mapTransactions(address, txs)

	balanceBTC := float64(addrInfo.ChainStats.FundedTxoSum-addrInfo.ChainStats.SpentTxoSum) / satoshisPerBTC

	return &domain.RawWalletData{
		Chain:                chain,
		Address:              address,
		Transactions:         rawTxs,
		InternalTransactions: []domain.RawTransaction{},
		NFTTransfers:         []domain.RawTransaction{},
		ERC1155Transfers:     []domain.RawTransaction{},
		Balance:              balanceBTC,
		TokenHoldings:        []domain.TokenHolding{},
		FirstTxTime:          firstTx,
		LastTxTime:           lastTx,
		DataSource:           "blockstream",
	}, nil
}

// ---- Blockstream API types ----

type bsAddressInfo struct {
	Address    string `json:"address"`
	ChainStats struct {
		FundedTxoCount int   `json:"funded_txo_count"`
		FundedTxoSum   int64 `json:"funded_txo_sum"`
		SpentTxoCount  int   `json:"spent_txo_count"`
		SpentTxoSum    int64 `json:"spent_txo_sum"`
		TxCount        int   `json:"tx_count"`
	} `json:"chain_stats"`
}

type bsTx struct {
	Txid   string  `json:"txid"`
	Vin    []bsVin `json:"vin"`
	Vout   []bsVout `json:"vout"`
	Status struct {
		Confirmed bool  `json:"confirmed"`
		BlockTime int64 `json:"block_time"`
	} `json:"status"`
}

type bsVin struct {
	Prevout struct {
		Scriptpubkey_address string `json:"scriptpubkey_address"`
		Value                int64  `json:"value"`
	} `json:"prevout"`
}

type bsVout struct {
	ScriptpubkeyAddress string `json:"scriptpubkey_address"`
	Value               int64  `json:"value"`
}

// ---- Helpers ----

func (p *BlockstreamProvider) fetchAddressInfo(ctx context.Context, address string) (*bsAddressInfo, error) {
	url := fmt.Sprintf("%s/address/%s", p.baseURL, address)
	body, err := p.get(ctx, url)
	if err != nil {
		return nil, err
	}
	var info bsAddressInfo
	if err := json.Unmarshal(body, &info); err != nil {
		return nil, fmt.Errorf("decode address info: %w", err)
	}
	return &info, nil
}

func (p *BlockstreamProvider) fetchTransactions(ctx context.Context, address string) ([]bsTx, error) {
	url := fmt.Sprintf("%s/address/%s/txs", p.baseURL, address)
	body, err := p.get(ctx, url)
	if err != nil {
		return nil, err
	}
	var txs []bsTx
	if err := json.Unmarshal(body, &txs); err != nil {
		return nil, fmt.Errorf("decode transactions: %w", err)
	}
	return txs, nil
}

func (p *BlockstreamProvider) get(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http get %s: %w", url, err)
	}
	defer resp.Body.Close() //nolint:errcheck

	if resp.StatusCode == http.StatusNotFound {
		return nil, fmt.Errorf("address not found (404)")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("blockstream returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	return body, nil
}

// mapTransactions converts Blockstream tx list into domain.RawTransaction slice.
// For each tx, any input spending from `address` is treated as a send (negative),
// and any output to `address` is treated as a receive (positive).
func mapTransactions(address string, txs []bsTx) ([]domain.RawTransaction, time.Time, time.Time) {
	var rawTxs []domain.RawTransaction
	var firstTx, lastTx time.Time

	for _, tx := range txs {
		ts := time.Time{}
		if tx.Status.BlockTime > 0 {
			ts = time.Unix(tx.Status.BlockTime, 0).UTC()
		}

		if firstTx.IsZero() || (!ts.IsZero() && ts.Before(firstTx)) {
			firstTx = ts
		}
		if lastTx.IsZero() || ts.After(lastTx) {
			lastTx = ts
		}

		// Build a single representative transaction entry:
		// from = first input address, to = first output to wallet (or first output).
		from := ""
		if len(tx.Vin) > 0 {
			from = tx.Vin[0].Prevout.Scriptpubkey_address
		}

		to := ""
		var value int64
		for _, out := range tx.Vout {
			if strings.EqualFold(out.ScriptpubkeyAddress, address) {
				to = out.ScriptpubkeyAddress
				value += out.Value
				break
			}
		}
		if to == "" && len(tx.Vout) > 0 {
			to = tx.Vout[0].ScriptpubkeyAddress
			value = tx.Vout[0].Value
		}

		rawTxs = append(rawTxs, domain.RawTransaction{
			Hash:      tx.Txid,
			From:      from,
			To:        to,
			Value:     float64(value) / satoshisPerBTC,
			Timestamp: ts,
		})
	}

	return rawTxs, firstTx, lastTx
}
