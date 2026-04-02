import Config

config :data_indexing,
  meilisearch_client: DataIndexing.Meilisearch.Client,
  meilisearch_url: "http://localhost:7700",
  meilisearch_api_key: "",
  meilisearch_index: "wallets",
  rabbitmq_url: "amqp://guest:guest@localhost:5673",
  rabbitmq_exchange: "score-cripto.events",
  rabbitmq_queue: "data-indexing.wallet.events",
  rabbitmq_routing_keys: ["wallet.data.cached", "wallet.score.calculated"],
  port: 4000,
  cache_ttl_minutes: 30,
  broadway_batch_size: 10,
  broadway_batch_timeout_ms: 1_000,
  endpoint_enabled: true,
  consumer_enabled: true

config :logger,
  level: :info

import_config "#{config_env()}.exs"
