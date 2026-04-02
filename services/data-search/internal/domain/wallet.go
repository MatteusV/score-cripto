package domain

import "time"

// WalletContext is the normalized output sent downstream to process-data-ia.
// FetchedAt and DataSource are internal metadata and are NOT included in events.
type WalletContext struct {
	Chain                    string   `json:"chain"`
	Address                  string   `json:"address"`
	TxCount                  int      `json:"tx_count"`
	InternalTxCount          int      `json:"internal_tx_count"`
	TotalVolume              float64  `json:"total_volume"`
	UniqueCounterparties     int      `json:"unique_counterparties"`
	WalletAgeDays            int      `json:"wallet_age_days"`
	LargestTxRatio           float64  `json:"largest_tx_ratio"`
	AvgTxValue               float64  `json:"avg_tx_value"`
	HasMixerInteraction      bool     `json:"has_mixer_interaction"`
	HasSanctionedInteraction bool     `json:"has_sanctioned_interaction"`
	TokenDiversity           int      `json:"token_diversity"`
	NftActivity              bool     `json:"nft_activity"`
	NftTransferCount         int      `json:"nft_transfer_count"`
	NftCollectionCount       int      `json:"nft_collection_count"`
	Erc1155TransferCount     int      `json:"erc1155_transfer_count"`
	Erc1155CollectionCount   int      `json:"erc1155_collection_count"`
	DefiInteractions         int      `json:"defi_interactions"`
	ProtocolInteractions     []string `json:"protocol_interactions"`
	RiskFlags                []string `json:"risk_flags"`
	FetchedAt                string   `json:"-"`
	DataSource               string   `json:"-"`
}

// RawWalletData holds unprocessed data from a blockchain provider.
type RawWalletData struct {
	Chain                string
	Address              string
	Transactions         []RawTransaction
	InternalTransactions []RawTransaction
	NFTTransfers         []RawTransaction
	ERC1155Transfers     []RawTransaction
	Balance              float64
	TokenHoldings        []TokenHolding
	FirstTxTime          time.Time
	LastTxTime           time.Time
	DataSource           string
}

// RawTransaction represents a single on-chain transaction.
type RawTransaction struct {
	Hash            string
	From            string
	To              string
	Value           float64
	Timestamp       time.Time
	IsTokenTransfer bool
	IsInternal      bool
	TokenSymbol     string
	TokenName       string
	IsNFT           bool
	IsERC1155       bool
	TokenID         string
	ContractAddress string
	TokenStandard   string
}

// TokenHolding represents a token held by the wallet.
type TokenHolding struct {
	ContractAddress string
	Symbol          string
	Balance         float64
}

// Known mixer and sanctioned addresses for risk detection.
var KnownMixerAddresses = map[string]bool{
	"0xd90e2f925da726b50c4ed8d0fb90ad053324f31b": true, // Tornado Cash Router
	"0x722122df12d4e14e13ac3b6895a86e84145b6967": true, // Tornado Cash Proxy
	"0xdd4c48c0b24039969fc16d1cdf626eab821d3384": true, // Tornado Cash 0.1 ETH
	"0xd4b88df4d29f5cedd6857912842cff3b20c8cfa3": true, // Tornado Cash 1 ETH
	"0xfd8610d20aa15b7b2e3be39b396a1bc3516c7144": true, // Tornado Cash 10 ETH
	"0x07687e702b410fa43f4cb4af7fa097918ffd2730": true, // Tornado Cash 100 ETH
}

var KnownSanctionedAddresses = map[string]bool{
	"0x8589427373d6d84e98730d7795d8f6f8731fda16": true, // OFAC sanctioned
	"0x72a5843cc08275c8171e582972aa4fda8c397b2a": true, // OFAC sanctioned
	"0x7f367cc41522ce07553e823bf3be79a889debe1b": true, // OFAC sanctioned
}

// Known DeFi contract addresses (generic).
var KnownDefiContracts = map[string]bool{
	"0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b": true, // Compound Comptroller
	"0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419": true, // Chainlink ETH/USD feed
	"0xd533a949740bb3306d119cc777fa900ba034cd52": true, // Curve DAO Token
}

// Known DEX contract addresses.
var KnownDexContracts = map[string]bool{
	"0x7a250d5630b4cf539739df2c5dacb4c659f2488d": true, // Uniswap V2 Router
	"0xe592427a0aece92de3edee1f18e0157c05861564": true, // Uniswap V3 Router
	"0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f": true, // SushiSwap Router
}

// Known lending contract addresses.
var KnownLendingContracts = map[string]bool{
	"0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9": true, // Aave V2 Lending Pool
	"0x87870bca3f3fd6335c3f4ce8392d69350b4fa4e2": true, // Aave V3 Pool
}

// Known bridge contract addresses.
var KnownBridgeContracts = map[string]bool{
	"0xa0c68c638235ee32657e8f720a23cec1bfc77c77": true, // Polygon PoS Bridge
	"0x72ce9c846789fdb6fc1f34ac4ad25dd9ef7031ef": true, // Arbitrum L1 Gateway Router
	"0x99c9fc46f92e8a1c0dec1b1747d010903e884be1": true, // Optimism L1 Standard Bridge
}
