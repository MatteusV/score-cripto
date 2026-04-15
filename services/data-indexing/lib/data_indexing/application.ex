defmodule DataIndexing.Application do
  use Application

  alias DataIndexing.{Config, HTTP.Router}

  @impl true
  def start(_type, _args) do
    # Setup OpenTelemetry instrumentation for Cowboy HTTP server
    :opentelemetry_cowboy.setup()

    children =
      [
        DataIndexing.Telemetry,
        DataIndexing.Cache.WalletContext,
        DataIndexing.IndexManager,
        maybe_endpoint_child()
      ]
      |> Enum.reject(&is_nil/1)
      |> Kernel.++(consumer_children())

    opts = [strategy: :one_for_one, name: DataIndexing.Supervisor]
    Supervisor.start_link(children, opts)
  end

  defp maybe_endpoint_child do
    if Config.endpoint_enabled?(), do: {Router, [port: Config.port()]}, else: nil
  end

  # RetryPublisher deve subir ANTES do Pipeline para que o canal AMQP
  # esteja pronto quando o Broadway começar a processar mensagens.
  defp consumer_children do
    if Config.consumer_enabled?() do
      [
        DataIndexing.Broadway.RetryPublisher,
        {DataIndexing.Broadway.Pipeline, name: DataIndexing.Broadway.Pipeline}
      ]
    else
      []
    end
  end
end
