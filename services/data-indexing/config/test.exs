import Config

config :data_indexing,
  meilisearch_client: DataIndexing.Meilisearch.Client,
  meilisearch_url: "http://localhost:7701",
  meilisearch_api_key: "test-master-key",
  meilisearch_index: "wallets_test",
  rabbitmq_url: "amqp://guest:guest@localhost:5673",
  rabbitmq_exchange: "score-cripto.events.test",
  rabbitmq_queue: "data-indexing.wallet.events.test",
  rabbitmq_routing_keys: ["wallet.data.cached", "wallet.score.calculated"],
  port: 4002,
  cache_ttl_minutes: 5,
  broadway_batch_size: 5,
  broadway_batch_timeout_ms: 50,
  req_test_mode: false,
  endpoint_enabled: false,
  consumer_enabled: false

config :logger, level: :warning
