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

	allTxs := make([]domain.RawTransaction, 0, len(raw.Transactions)+len(raw.InternalTransactions)+len(raw.NFTTransfers)+len(raw.ERC1155Transfers))
	allTxs = append(allTxs, raw.Transactions...)
	allTxs = append(allTxs, raw.InternalTransactions...)
	allTxs = append(allTxs, raw.NFTTransfers...)
	allTxs = append(allTxs, raw.ERC1155Transfers...)
	txCount := len(allTxs)
	var totalVolume float64
	var largestTx float64
	counterparties := map[string]bool{}
	defiContracts := map[string]bool{}
	dexContracts := map[string]bool{}
	lendingContracts := map[string]bool{}
	bridgeContracts := map[string]bool{}
	hasGenericDefi := false
	hasMixer := false
	hasSanctioned := false
	hasNFT := false
	tokenSymbols := map[string]bool{}
	nftCollections := map[string]bool{}
	erc1155Collections := map[string]bool{}

	for _, tx := range allTxs {
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

		// Check protocol interactions.
		to := strings.ToLower(tx.To)
		contract := strings.ToLower(tx.ContractAddress)
		if domain.KnownDexContracts[to] {
			dexContracts[to] = true
			defiContracts[to] = true
		}
		if contract != "" && domain.KnownDexContracts[contract] {
			dexContracts[contract] = true
			defiContracts[contract] = true
		}
		if domain.KnownLendingContracts[to] {
			lendingContracts[to] = true
			defiContracts[to] = true
		}
		if contract != "" && domain.KnownLendingContracts[contract] {
			lendingContracts[contract] = true
			defiContracts[contract] = true
		}
		if domain.KnownBridgeContracts[to] {
			bridgeContracts[to] = true
			defiContracts[to] = true
		}
		if contract != "" && domain.KnownBridgeContracts[contract] {
			bridgeContracts[contract] = true
			defiContracts[contract] = true
		}
		if domain.KnownDefiContracts[to] {
			defiContracts[to] = true
			hasGenericDefi = true
		}
		if contract != "" && domain.KnownDefiContracts[contract] {
			defiContracts[contract] = true
			hasGenericDefi = true
		}

		// Token diversity and NFT activity.
		if tx.IsTokenTransfer && tx.TokenSymbol != "" && tx.TokenStandard == "erc20" {
			tokenSymbols[tx.TokenSymbol] = true
		}
		if tx.IsNFT {
			hasNFT = true
			if tx.ContractAddress != "" {
				nftCollections[strings.ToLower(tx.ContractAddress)] = true
			}
		}
		if tx.IsERC1155 {
			hasNFT = true
			if tx.ContractAddress != "" {
				erc1155Collections[strings.ToLower(tx.ContractAddress)] = true
			}
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

	protocolInteractions := buildProtocolInteractions(
		hasMixer,
		hasSanctioned,
		hasNFT,
		len(dexContracts),
		len(lendingContracts),
		len(bridgeContracts),
		hasGenericDefi,
	)

	return &domain.WalletContext{
		Chain:                    strings.ToLower(raw.Chain),
		Address:                  address,
		TxCount:                  txCount,
		InternalTxCount:          len(raw.InternalTransactions),
		TotalVolume:              round(totalVolume, 6),
		UniqueCounterparties:     len(counterparties),
		WalletAgeDays:            walletAgeDays,
		LargestTxRatio:           round(largestTxRatio, 4),
		AvgTxValue:               round(avgTxValue, 6),
		HasMixerInteraction:      hasMixer,
		HasSanctionedInteraction: hasSanctioned,
		TokenDiversity:           len(tokenSymbols),
		NftActivity:              hasNFT,
		NftTransferCount:         len(raw.NFTTransfers),
		NftCollectionCount:       len(nftCollections),
		Erc1155TransferCount:     len(raw.ERC1155Transfers),
		Erc1155CollectionCount:   len(erc1155Collections),
		DefiInteractions:         len(defiContracts),
		ProtocolInteractions:     protocolInteractions,
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

func buildProtocolInteractions(hasMixer, hasSanctioned, hasNFT bool, dexCount, lendingCount, bridgeCount int, hasGenericDefi bool) []string {
	interactions := make([]string, 0, 7)
	if dexCount > 0 {
		interactions = append(interactions, "dex")
	}
	if lendingCount > 0 {
		interactions = append(interactions, "lending")
	}
	if bridgeCount > 0 {
		interactions = append(interactions, "bridge")
	}
	if hasGenericDefi {
		interactions = append(interactions, "defi")
	}
	if hasNFT {
		interactions = append(interactions, "nft")
	}
	if hasMixer {
		interactions = append(interactions, "mixer")
	}
	if hasSanctioned {
		interactions = append(interactions, "sanctioned")
	}
	if interactions == nil {
		return []string{}
	}
	return interactions
}

func round(val float64, precision int) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}
