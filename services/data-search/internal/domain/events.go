package domain

import (
	"encoding/json"
	"fmt"
	"time"
)

// WalletDataRequestedEvent is consumed from the wallet.data.requested queue.
type WalletDataRequestedEvent struct {
	Event         string                   `json:"event"`
	SchemaVersion string                   `json:"schemaVersion"`
	Timestamp     time.Time                `json:"timestamp"`
	Data          WalletDataRequestedData  `json:"data"`
}

// WalletDataRequestedData holds the payload for a wallet data request.
type WalletDataRequestedData struct {
	RequestID string `json:"requestId"`
	UserID    string `json:"userId"`
	Chain     string `json:"chain"`
	Address   string `json:"address"`
}

// Validate ensures all required fields are present.
func (e *WalletDataRequestedEvent) Validate() error {
	if e.Data.RequestID == "" {
		return fmt.Errorf("missing required field: requestId")
	}
	if e.Data.UserID == "" {
		return fmt.Errorf("missing required field: userId")
	}
	if e.Data.Chain == "" {
		return fmt.Errorf("missing required field: chain")
	}
	if e.Data.Address == "" {
		return fmt.Errorf("missing required field: address")
	}
	return nil
}

// ParseWalletDataRequestedEvent parses and validates a raw JSON message.
func ParseWalletDataRequestedEvent(data []byte) (*WalletDataRequestedEvent, error) {
	var evt WalletDataRequestedEvent
	if err := json.Unmarshal(data, &evt); err != nil {
		return nil, fmt.Errorf("invalid JSON: %w", err)
	}
	if err := evt.Validate(); err != nil {
		return nil, err
	}
	return &evt, nil
}

// WalletDataCachedEvent is published after wallet data is cached.
type WalletDataCachedEvent struct {
	Event         string               `json:"event"`
	SchemaVersion string               `json:"schemaVersion"`
	Timestamp     time.Time            `json:"timestamp"`
	Data          WalletDataCachedData `json:"data"`
}

// WalletDataCachedData holds the payload for a cached wallet event.
type WalletDataCachedData struct {
	RequestID     string               `json:"requestId"`
	UserID        string               `json:"userId"`
	WalletContext WalletContextPayload `json:"walletContext"`
}

// WalletContextPayload is the struct serialized into events.
// It excludes internal metadata fields (FetchedAt, DataSource).
type WalletContextPayload struct {
	Chain                    string   `json:"chain"`
	Address                  string   `json:"address"`
	TxCount                  int      `json:"tx_count"`
	TotalVolume              float64  `json:"total_volume"`
	UniqueCounterparties     int      `json:"unique_counterparties"`
	WalletAgeDays            int      `json:"wallet_age_days"`
	LargestTxRatio           float64  `json:"largest_tx_ratio"`
	AvgTxValue               float64  `json:"avg_tx_value"`
	HasMixerInteraction      bool     `json:"has_mixer_interaction"`
	HasSanctionedInteraction bool     `json:"has_sanctioned_interaction"`
	TokenDiversity           int      `json:"token_diversity"`
	NftActivity              bool     `json:"nft_activity"`
	DefiInteractions         int      `json:"defi_interactions"`
	RiskFlags                []string `json:"risk_flags"`
}

// walletContextToPayload converts a WalletContext to a WalletContextPayload,
// intentionally omitting FetchedAt and DataSource.
func walletContextToPayload(wc *WalletContext) WalletContextPayload {
	riskFlags := wc.RiskFlags
	if riskFlags == nil {
		riskFlags = []string{}
	}
	return WalletContextPayload{
		Chain:                    wc.Chain,
		Address:                  wc.Address,
		TxCount:                  wc.TxCount,
		TotalVolume:              wc.TotalVolume,
		UniqueCounterparties:     wc.UniqueCounterparties,
		WalletAgeDays:            wc.WalletAgeDays,
		LargestTxRatio:           wc.LargestTxRatio,
		AvgTxValue:               wc.AvgTxValue,
		HasMixerInteraction:      wc.HasMixerInteraction,
		HasSanctionedInteraction: wc.HasSanctionedInteraction,
		TokenDiversity:           wc.TokenDiversity,
		NftActivity:              wc.NftActivity,
		DefiInteractions:         wc.DefiInteractions,
		RiskFlags:                riskFlags,
	}
}

// NewWalletDataCachedEvent builds a properly formed WalletDataCachedEvent.
func NewWalletDataCachedEvent(requestID, userID string, wc *WalletContext) WalletDataCachedEvent {
	return WalletDataCachedEvent{
		Event:         "wallet.data.cached",
		SchemaVersion: "1",
		Timestamp:     time.Now().UTC(),
		Data: WalletDataCachedData{
			RequestID:     requestID,
			UserID:        userID,
			WalletContext: walletContextToPayload(wc),
		},
	}
}
