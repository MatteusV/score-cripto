defmodule ScoreCriptoDataIndexing.MixProject do
  use Mix.Project

  def project do
    [
      app: :score_cripto_data_indexing,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      aliases: aliases()
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {ScoreCriptoDataIndexing.Application, []}
    ]
  end

  defp deps do
    [
      # Event streaming & message bus
      {:broadway, "~> 1.1"},
      {:gen_stage, "~> 1.4"},
      {:amqp, "~> 3.3"},

      # Cache & data stores
      {:redix, "~> 1.2"},
      {:meilisearch, "~> 0.20"},

      # Scheduling & cron jobs
      {:quantum, "~> 3.7"},

      # HTTP client for external APIs
      {:httpoison, "~> 2.0"},
      {:jason, "~> 1.4"},

      # Database & ORM
      {:ecto, "~> 3.11"},
      {:ecto_sql, "~> 3.11"},
      {:postgrex, "~> 0.17"},

      # Configuration
      {:dotenvy, "~> 0.2"},

      # Observability
      {:telemetry, "~> 1.2"},
      {:opentelemetry, "~> 1.3"},
      {:opentelemetry_exporter, "~> 1.6"},
      {:opentelemetry_ecto, "~> 0.2"},

      # Utilities
      {:retry, "~> 0.18"},
      {:hammer, "~> 6.2"},

      # Development dependencies
      {:ex_doc, "~> 0.30", only: :dev},
      {:credo, "~> 1.7", only: :dev},
      {:dialyxir, "~> 1.4", only: :dev},
      {:mix_test_watch, "~> 1.1", only: :dev},

      # Testing
      {:ex_unit_assert, "~> 0.2", only: :test},
      {:mox, "~> 1.1", only: :test}
    ]
  end

  defp aliases do
    [
      "ecto.setup": ["ecto.create", "ecto.migrate"],
      "ecto.reset": ["ecto.drop", "ecto.setup"]
    ]
  end
end
