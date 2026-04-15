import Config

if config_env() != :test do
  config :opentelemetry,
    resource: [
      service: [
        name: System.get_env("OTEL_SERVICE_NAME", "data-indexing"),
        version: "0.1.0"
      ]
    ],
    processors: [
      otel_batch_processor: %{
        exporter: {:opentelemetry_exporter, %{}}
      }
    ]

  config :opentelemetry_exporter,
    otlp_endpoint: System.get_env("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318"),
    otlp_protocol: :http_protobuf

  config :data_indexing,
    meilisearch_url: System.get_env("MEILISEARCH_URL", "http://localhost:7700"),
    meilisearch_api_key: System.get_env("MEILI_MASTER_KEY", ""),
    meilisearch_index: System.get_env("MEILISEARCH_INDEX", "wallets"),
    rabbitmq_url: System.get_env("RABBITMQ_URL", "amqp://guest:guest@localhost:5673"),
    rabbitmq_exchange: System.get_env("RABBITMQ_EXCHANGE", "score-cripto.events"),
    rabbitmq_queue: System.get_env("RABBITMQ_QUEUE", "data-indexing.wallet.events"),
    port: String.to_integer(System.get_env("PORT", "4000")),
    cache_ttl_minutes: String.to_integer(System.get_env("CACHE_TTL_MINUTES", "30")),
    broadway_batch_size: String.to_integer(System.get_env("BROADWAY_BATCH_SIZE", "10")),
    broadway_batch_timeout_ms:
      String.to_integer(System.get_env("BROADWAY_BATCH_TIMEOUT_MS", "1000"))
end
