package domain_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/score-cripto/data-search/internal/domain"
)

func TestParseWalletDataRequestedEvent_Valid(t *testing.T) {
	payload := []byte(`{
		"event": "wallet.data.requested",
		"schemaVersion": "1",
		"timestamp": "2026-04-01T00:00:00Z",
		"data": {
			"requestId": "req-123",
			"userId": "user-456",
			"chain": "ethereum",
			"address": "0xabc123"
		}
	}`)

	evt, err := domain.ParseWalletDataRequestedEvent(payload)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if evt.Event != "wallet.data.requested" {
		t.Errorf("expected event wallet.data.requested, got %s", evt.Event)
	}
	if evt.Data.RequestID != "req-123" {
		t.Errorf("expected requestId req-123, got %s", evt.Data.RequestID)
	}
	if evt.Data.UserID != "user-456" {
		t.Errorf("expected userId user-456, got %s", evt.Data.UserID)
	}
	if evt.Data.Chain != "ethereum" {
		t.Errorf("expected chain ethereum, got %s", evt.Data.Chain)
	}
	if evt.Data.Address != "0xabc123" {
		t.Errorf("expected address 0xabc123, got %s", evt.Data.Address)
	}
}

func TestParseWalletDataRequestedEvent_InvalidJSON(t *testing.T) {
	_, err := domain.ParseWalletDataRequestedEvent([]byte(`not json`))
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestParseWalletDataRequestedEvent_MissingRequestID(t *testing.T) {
	payload := []byte(`{
		"event": "wallet.data.requested",
		"schemaVersion": "1",
		"timestamp": "2026-04-01T00:00:00Z",
		"data": {
			"userId": "user-456",
			"chain": "ethereum",
			"address": "0xabc123"
		}
	}`)
	_, err := domain.ParseWalletDataRequestedEvent(payload)
	if err == nil {
		t.Fatal("expected error for missing requestId, got nil")
	}
}

func TestParseWalletDataRequestedEvent_MissingUserID(t *testing.T) {
	payload := []byte(`{
		"event": "wallet.data.requested",
		"schemaVersion": "1",
		"timestamp": "2026-04-01T00:00:00Z",
		"data": {
			"requestId": "req-123",
			"chain": "ethereum",
			"address": "0xabc123"
		}
	}`)
	_, err := domain.ParseWalletDataRequestedEvent(payload)
	if err == nil {
		t.Fatal("expected error for missing userId, got nil")
	}
}

func TestParseWalletDataRequestedEvent_MissingChain(t *testing.T) {
	payload := []byte(`{
		"event": "wallet.data.requested",
		"schemaVersion": "1",
		"timestamp": "2026-04-01T00:00:00Z",
		"data": {
			"requestId": "req-123",
			"userId": "user-456",
			"address": "0xabc123"
		}
	}`)
	_, err := domain.ParseWalletDataRequestedEvent(payload)
	if err == nil {
		t.Fatal("expected error for missing chain, got nil")
	}
}

func TestParseWalletDataRequestedEvent_MissingAddress(t *testing.T) {
	payload := []byte(`{
		"event": "wallet.data.requested",
		"schemaVersion": "1",
		"timestamp": "2026-04-01T00:00:00Z",
		"data": {
			"requestId": "req-123",
			"userId": "user-456",
			"chain": "ethereum"
		}
	}`)
	_, err := domain.ParseWalletDataRequestedEvent(payload)
	if err == nil {
		t.Fatal("expected error for missing address, got nil")
	}
}

func TestNewWalletDataCachedEvent_Fields(t *testing.T) {
	wc := &domain.WalletContext{
		Chain:                    "ethereum",
		Address:                  "0xabc123",
		TxCount:                  42,
		TotalVolume:              100.5,
		UniqueCounterparties:     10,
		WalletAgeDays:            365,
		LargestTxRatio:           0.2,
		AvgTxValue:               2.39,
		HasMixerInteraction:      false,
		HasSanctionedInteraction: false,
		TokenDiversity:           5,
		NftActivity:              true,
		DefiInteractions:         3,
		RiskFlags:                []string{},
		FetchedAt:                time.Now().Format(time.RFC3339),
		DataSource:               "etherscan",
	}

	evt := domain.NewWalletDataCachedEvent("req-123", "user-456", wc)

	if evt.Event != "wallet.data.cached" {
		t.Errorf("expected event wallet.data.cached, got %s", evt.Event)
	}
	if evt.SchemaVersion != "1" {
		t.Errorf("expected schemaVersion 1, got %s", evt.SchemaVersion)
	}
	if evt.Data.RequestID != "req-123" {
		t.Errorf("expected requestId req-123, got %s", evt.Data.RequestID)
	}
	if evt.Data.UserID != "user-456" {
		t.Errorf("expected userId user-456, got %s", evt.Data.UserID)
	}
	if evt.Data.WalletContext.Chain != "ethereum" {
		t.Errorf("expected chain ethereum, got %s", evt.Data.WalletContext.Chain)
	}
	if evt.Data.WalletContext.TxCount != 42 {
		t.Errorf("expected tx_count 42, got %d", evt.Data.WalletContext.TxCount)
	}
}

func TestWalletDataCachedEvent_JSONSerializationExcludesInternalFields(t *testing.T) {
	wc := &domain.WalletContext{
		Chain:      "ethereum",
		Address:    "0xabc123",
		RiskFlags:  []string{},
		FetchedAt:  "2026-04-01T00:00:00Z",
		DataSource: "etherscan",
	}

	evt := domain.NewWalletDataCachedEvent("req-123", "user-456", wc)

	raw, err := json.Marshal(evt)
	if err != nil {
		t.Fatalf("marshal failed: %v", err)
	}

	// Parse the walletContext portion.
	var parsed struct {
		Data struct {
			WalletContext map[string]interface{} `json:"walletContext"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		t.Fatalf("unmarshal failed: %v", err)
	}

	if _, ok := parsed.Data.WalletContext["fetched_at"]; ok {
		t.Error("walletContext must NOT contain fetched_at in JSON output")
	}
	if _, ok := parsed.Data.WalletContext["data_source"]; ok {
		t.Error("walletContext must NOT contain data_source in JSON output")
	}
	if _, ok := parsed.Data.WalletContext["chain"]; !ok {
		t.Error("walletContext must contain chain")
	}
}
