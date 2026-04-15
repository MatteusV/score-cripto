defmodule DataIndexing.MixProject do
  use Mix.Project

  def project do
    [
      app: :data_indexing,
      version: "0.1.0",
      elixir: "~> 1.17",
      elixirc_paths: elixirc_paths(Mix.env()),
      start_permanent: Mix.env() == :prod,
      deps: deps(),
      aliases: aliases(),
      test_coverage: [tool: ExCoveralls]
    ]
  end

  def application do
    [
      extra_applications: [:logger, :runtime_tools],
      mod: {DataIndexing.Application, []}
    ]
  end

  def cli do
    [
      preferred_envs: [
        coveralls: :test,
        "coveralls.detail": :test,
        "coveralls.html": :test
      ]
    ]
  end

  defp elixirc_paths(:test), do: ["lib", "test/support"]
  defp elixirc_paths(_), do: ["lib"]

  defp deps do
    [
      # HTTP framework (API only)
      {:plug_cowboy, "~> 2.7"},
      {:plug, "~> 1.16"},

      # JSON
      {:jason, "~> 1.4"},

      # Structured JSON logging
      {:logger_json, "~> 6.0"},

      # HTTP client (for Meilisearch)
      {:req, "~> 0.5"},

      # Message broker
      {:broadway, "~> 1.1"},
      {:broadway_rabbitmq, "~> 0.8"},

      # Telemetry
      {:telemetry, "~> 1.3"},
      {:telemetry_metrics, "~> 1.0"},
      {:telemetry_poller, "~> 1.1"},

      # OpenTelemetry distributed tracing
      {:opentelemetry, "~> 1.5"},
      {:opentelemetry_api, "~> 1.4"},
      {:opentelemetry_exporter, "~> 1.8"},
      {:opentelemetry_cowboy, "~> 0.3"},
      {:opentelemetry_semantic_conventions, "~> 0.2"},

      # Dev & Test
      {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
      {:dialyxir, "~> 1.4", only: [:dev], runtime: false},
      {:mox, "~> 1.2", only: :test},
      {:excoveralls, "~> 0.18", only: :test},
      {:mix_test_watch, "~> 1.2", only: :dev, runtime: false}
    ]
  end

  defp aliases do
    [
      setup: ["deps.get"],
      lint: ["credo --strict"]
    ]
  end
end
