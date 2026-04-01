package provider

import (
	"math"
	"strings"
	"time"

	"github.com/score-cripto/data-search/internal/domain"
)

// NormalizeAddress normalizes a blockchain address based on the chain.
// Ethereum-compatible chains use checksumless lowercase; others pass through trimmed.
func NormalizeAddress(chain, address string) string {
	chain = strings.ToLower(strings.TrimSpace(chain))
	address = strings.TrimSpace(address)

	switch chain {
	case "ethereum", "polygon", "arbitrum", "optimism", "avalanche", "bsc":
		return strings.ToLower(address)
	case "bitcoin":
		// Bitcoin addresses are case-sensitive; only trim.
		return address
	case "solana":
		return address
	default:
		return strings.ToLower(address)
	}
}

// Normalize converts RawWalletData into a WalletContext with derived metrics.
func Normalize(raw *domain.RawWalletData) *domain.WalletContext {
	now := time.Now().UTC()
	address := NormalizeAddress(raw.Chain, raw.Address)

	txCount := len(raw.Transactions)
	var totalVolume float64
	var largestTx float64
	counterparties := map[string]bool{}
	defiContracts := map[string]bool{}
	hasMixer := false
	hasSanctioned := false
	hasNFT := false
	tokenSymbols := map[string]bool{}

	for _, tx := range raw.Transactions {
		totalVolume += math.Abs(tx.Value)

		if math.Abs(tx.Value) > largestTx {
			largestTx = math.Abs(tx.Value)
		}

		// Track unique counterparties (exclude self).
		other := tx.To
		if strings.EqualFold(tx.To, address) {
			other = tx.From
		}
		if other != "" {
			counterparties[strings.ToLower(other)] = true
		}

		// Check mixer interaction.
		if domain.KnownMixerAddresses[strings.ToLower(tx.From)] || domain.KnownMixerAddresses[strings.ToLower(tx.To)] {
			hasMixer = true
		}

		// Check sanctioned interaction.
		if domain.KnownSanctionedAddresses[strings.ToLower(tx.From)] || domain.KnownSanctionedAddresses[strings.ToLower(tx.To)] {
			hasSanctioned = true
		}

		// Check DeFi interaction.
		if domain.KnownDefiContracts[strings.ToLower(tx.To)] || domain.KnownDefiContracts[strings.ToLower(tx.ContractAddress)] {
			addr := strings.ToLower(tx.To)
			if domain.KnownDefiContracts[strings.ToLower(tx.ContractAddress)] {
				addr = strings.ToLower(tx.ContractAddress)
			}
			defiContracts[addr] = true
		}

		// Token diversity and NFT activity.
		if tx.IsTokenTransfer && tx.TokenSymbol != "" {
			tokenSymbols[tx.TokenSymbol] = true
		}
		if tx.IsNFT {
			hasNFT = true
		}
	}

	// Wallet age in days.
	var walletAgeDays int
	if !raw.FirstTxTime.IsZero() {
		walletAgeDays = int(now.Sub(raw.FirstTxTime).Hours() / 24)
	}

	// Derived ratios.
	var largestTxRatio float64
	if totalVolume > 0 {
		largestTxRatio = largestTx / totalVolume
	}

	var avgTxValue float64
	if txCount > 0 {
		avgTxValue = totalVolume / float64(txCount)
	}

	// Risk flags.
	riskFlags := buildRiskFlags(hasMixer, hasSanctioned, txCount, walletAgeDays, largestTxRatio, totalVolume)

	return &domain.WalletContext{
		Chain:                    strings.ToLower(raw.Chain),
		Address:                  address,
		TxCount:                  txCount,
		TotalVolume:              round(totalVolume, 6),
		UniqueCounterparties:     len(counterparties),
		WalletAgeDays:            walletAgeDays,
		LargestTxRatio:           round(largestTxRatio, 4),
		AvgTxValue:               round(avgTxValue, 6),
		HasMixerInteraction:      hasMixer,
		HasSanctionedInteraction: hasSanctioned,
		TokenDiversity:           len(tokenSymbols),
		NftActivity:              hasNFT,
		DefiInteractions:         len(defiContracts),
		RiskFlags:                riskFlags,
		FetchedAt:                now.Format(time.RFC3339),
		DataSource:               raw.DataSource,
	}
}

func buildRiskFlags(hasMixer, hasSanctioned bool, txCount, walletAgeDays int, largestTxRatio, totalVolume float64) []string {
	var flags []string

	if hasMixer {
		flags = append(flags, "mixer_interaction")
	}
	if hasSanctioned {
		flags = append(flags, "sanctioned_interaction")
	}
	if walletAgeDays < 30 && txCount > 50 {
		flags = append(flags, "new_wallet_high_activity")
	}
	if largestTxRatio > 0.8 && txCount > 1 {
		flags = append(flags, "single_tx_dominance")
	}
	if txCount == 0 {
		flags = append(flags, "no_transaction_history")
	}
	if totalVolume > 1000 && walletAgeDays < 7 {
		flags = append(flags, "high_volume_new_wallet")
	}

	if flags == nil {
		flags = []string{}
	}
	return flags
}

func round(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}
