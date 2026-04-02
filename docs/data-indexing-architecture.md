# Data Indexing Service Architecture

## Overview

`data-indexing` is an Elixir/OTP service that keeps a search-oriented projection of analyzed wallets in Meilisearch.

It consumes two RabbitMQ events from the shared topic exchange `score-cripto.events`:
- `wallet.data.cached`
- `wallet.score.calculated`

The service keeps a short-lived ETS cache of wallet context from `wallet.data.cached`, then joins that context with `wallet.score.calculated` before bulk-indexing the final document in Meilisearch.

The service also exposes a lightweight HTTP API for search and health checks.

## Runtime Components

- `DataIndexing.Cache.WalletContext`
  - ETS-backed cache for `walletContext`
  - TTL-based cleanup
- `DataIndexing.IndexManager`
  - guarantees the `wallets` index exists
  - reapplies searchable/filterable/sortable settings on boot
- `DataIndexing.Broadway.Pipeline`
  - consumes RabbitMQ messages
  - validates payloads
  - caches `wallet.data.cached`
  - transforms and batches `wallet.score.calculated`
  - bulk-indexes documents in Meilisearch
- `DataIndexing.HTTP.Router`
  - `GET /api/search`
  - `GET /api/wallets/:chain/:address`
  - `GET /api/stats`
  - `GET /api/health`
- `DataIndexing.Telemetry`
  - emits metrics for cache, Meilisearch, Broadway, and HTTP search flows

## Supervision Tree

```text
DataIndexing.Application
├── DataIndexing.Telemetry
├── DataIndexing.Cache.WalletContext
├── DataIndexing.IndexManager
├── DataIndexing.HTTP.Router (Plug.Cowboy)
└── DataIndexing.Broadway.Pipeline
```

`DataIndexing.Broadway.Pipeline` is disabled in test by config, but enabled in normal runtime.

## Event Contracts

### `wallet.data.cached`

Published by `data-search`.

```json
{
  "event": "wallet.data.cached",
  "timestamp": "2026-04-01T12:00:00.000Z",
  "data": {
    "requestId": "req_123",
    "userId": "user_123",
    "walletContext": {
      "chain": "ethereum",
      "address": "0xabc123",
      "tx_count": 150,
      "total_volume": 45.5,
      "unique_counterparties": 30,
      "wallet_age_days": 365,
      "largest_tx_ratio": 0.15,
      "avg_tx_value": 0.30,
      "has_mixer_interaction": false,
      "has_sanctioned_interaction": false,
      "token_diversity": 12,
      "nft_activity": true,
      "defi_interactions": 5,
      "risk_flags": ["new_wallet_high_activity"]
    }
  }
}
```

### `wallet.score.calculated`

Published by `process-data-ia`.

```json
{
  "event": "wallet.score.calculated",
  "timestamp": "2026-04-01T12:00:00.000Z",
  "data": {
    "processId": "proc_123",
    "chain": "ethereum",
    "address": "0xabc123",
    "score": 75,
    "confidence": 0.92,
    "modelVersion": "gpt-4o-mini",
    "promptVersion": "v1.0"
  }
}
```

## Join Strategy

`wallet.score.calculated` does not currently contain the full wallet context.

The service handles this with a local join:
1. `wallet.data.cached` arrives first and populates ETS
2. `wallet.score.calculated` arrives later
3. the pipeline looks up `chain + normalized address` in ETS
4. if the cache entry exists, the indexed document is enriched
5. if it does not exist, the service still indexes the score-only document

This preserves availability and avoids coupling `data-indexing` back to Redis in `data-search`.

## Indexed Document Shape

```json
{
  "id": "ethereum_0xabc123",
  "chain": "ethereum",
  "address": "0xabc123",
  "score": 75,
  "confidence": 0.92,
  "model_version": "gpt-4o-mini",
  "prompt_version": "v1.0",
  "process_id": "proc_123",
  "tx_count": 150,
  "total_volume": 45.5,
  "unique_counterparties": 30,
  "wallet_age_days": 365,
  "largest_tx_ratio": 0.15,
  "avg_tx_value": 0.30,
  "has_mixer_interaction": false,
  "has_sanctioned_interaction": false,
  "token_diversity": 12,
  "nft_activity": true,
  "defi_interactions": 5,
  "risk_flags": ["new_wallet_high_activity"],
  "indexed_at": "2026-04-01T12:00:00Z"
}
```

## Meilisearch Index

Index: `wallets`

- Primary key: `id`
- Searchable attributes:
  - `address`
  - `chain`
  - `reasoning`
  - `positive_factors`
  - `risk_factors`
- Filterable attributes:
  - `chain`
  - `score`
  - `confidence`
  - `has_mixer_interaction`
  - `has_sanctioned_interaction`
  - `risk_flags`
  - `model_version`
- Sortable attributes:
  - `score`
  - `confidence`
  - `wallet_age_days`
  - `tx_count`
  - `total_volume`
  - `indexed_at`

## HTTP API

### `GET /api/search`

Supported query params:
- `q`
- `chain`
- `min_score`
- `max_score`
- `risk_flags[]`
- `page`
- `per_page`
- `sort_by`
- `sort_order`

### `GET /api/wallets/:chain/:address`

Fetches the single indexed wallet document by chain and normalized address.

### `GET /api/stats`

Returns aggregate stats derived from indexed hits.

### `GET /api/health`

Returns service status plus Meilisearch and RabbitMQ/Broadway connectivity state.

## Telemetry

Events emitted:
- `[:data_indexing, :cache, :hit]`
- `[:data_indexing, :cache, :miss]`
- `[:data_indexing, :meilisearch, :request]`
- `[:data_indexing, :meilisearch, :index, :documents_count]`
- `[:data_indexing, :broadway, :message, :processed]`
- `[:data_indexing, :broadway, :message, :failed]`
- `[:data_indexing, :search, :request]`
- `[:data_indexing, :search, :results]`

## Known Gap

The current `wallet.score.calculated` event does not include `reasoning`, `positiveFactors`, or `riskFactors`, so those fields cannot yet be indexed from the real event payload. That should be tracked as follow-up work in `process-data-ia` if richer search relevance is required.
