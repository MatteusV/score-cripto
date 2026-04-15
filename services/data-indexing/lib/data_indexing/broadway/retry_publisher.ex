defmodule DataIndexing.Broadway.RetryPublisher do
  @moduledoc """
  GenServer que mantém um canal AMQP dedicado para publicar mensagens
  na retry queue com TTL de backoff exponencial.

  Ao iniciar, declara o retry exchange e a retry queue via DlqTopology.
  O shutdown gracioso fecha o canal e a conexão sem vazar recursos.
  """

  @behaviour DataIndexing.Broadway.RetryPublisherBehaviour

  use GenServer

  require Logger

  alias DataIndexing.{Broadway.DlqTopology, Config}

  @max_retries 3
  @base_delay_ms 1_000

  # ── Public API ────────────────────────────────────────────────────────────────

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Agenda retry da mensagem publicando na retry queue com TTL de backoff exponencial.
  Retorna `:ok` se o retry foi agendado; `{:error, :max_retries_exceeded}` se
  já esgotou as tentativas — caller deve deixar mensagem ir para DLQ.
  """
  @impl DataIndexing.Broadway.RetryPublisherBehaviour
  @spec schedule_retry(binary(), String.t(), list(), non_neg_integer()) ::
          :ok | {:error, :max_retries_exceeded}
  def schedule_retry(payload, routing_key, amqp_headers, retry_count)
      when is_binary(payload) do
    if retry_count >= @max_retries do
      {:error, :max_retries_exceeded}
    else
      GenServer.call(__MODULE__, {:publish, payload, routing_key, amqp_headers, retry_count})
    end
  end

  def max_retries, do: @max_retries

  # ── GenServer callbacks ───────────────────────────────────────────────────────

  @impl true
  def init(_opts) do
    {:ok, %{conn: nil, channel: nil}, {:continue, :connect}}
  end

  @impl true
  def handle_continue(:connect, state) do
    case open_connection_and_channel() do
      {:ok, conn, channel} ->
        queue = Config.rabbitmq_queue()
        exchange = Config.rabbitmq_exchange()

        case DlqTopology.declare_retry_topology(channel, queue, exchange) do
          :ok ->
            Logger.info("[RetryPublisher] conectado e retry topology declarada")
            {:noreply, %{conn: conn, channel: channel}}

          {:error, reason} ->
            Logger.error("[RetryPublisher] falha ao declarar retry topology: #{inspect(reason)}")
            {:stop, reason, state}
        end

      {:error, reason} ->
        Logger.error("[RetryPublisher] falha ao conectar ao RabbitMQ: #{inspect(reason)}")
        {:stop, reason, state}
    end
  end

  @impl true
  def handle_call({:publish, payload, routing_key, amqp_headers, retry_count}, _from, state) do
    delay = compute_backoff_ms(retry_count)
    new_headers = build_retry_headers(amqp_headers, retry_count + 1)
    retry_exchange = DlqTopology.retry_exchange_name()

    result =
      AMQP.Basic.publish(state.channel, retry_exchange, routing_key, payload,
        persistent: true,
        expiration: to_string(delay),
        headers: new_headers
      )

    case result do
      :ok ->
        Logger.debug(
          "[RetryPublisher] retry agendado routing_key=#{routing_key} count=#{retry_count + 1} delay=#{delay}ms"
        )

        {:reply, :ok, state}

      {:error, reason} ->
        Logger.error("[RetryPublisher] falha ao publicar retry: #{inspect(reason)}")
        {:reply, {:error, reason}, state}
    end
  end

  @impl true
  def terminate(reason, %{conn: conn, channel: channel}) do
    Logger.info("[RetryPublisher] encerrando (#{inspect(reason)})")

    if channel, do: AMQP.Channel.close(channel)
    if conn, do: AMQP.Connection.close(conn)

    :ok
  end

  def terminate(_reason, _state), do: :ok

  # ── Private helpers ───────────────────────────────────────────────────────────

  defp open_connection_and_channel do
    with {:ok, conn} <- AMQP.Connection.open(Config.rabbitmq_connection_options()),
         {:ok, channel} <- AMQP.Channel.open(conn) do
      {:ok, conn, channel}
    end
  end

  defp compute_backoff_ms(retry_count) do
    base = @base_delay_ms * Integer.pow(2, retry_count)
    # ±10% jitter (consistente com implementação Node.js)
    jitter = 0.9 + :rand.uniform() * 0.2
    round(base * jitter)
  end

  defp build_retry_headers(amqp_headers, next_retry_count) do
    base =
      amqp_headers
      |> Enum.reject(fn {name, _type, _val} -> name == "x-retry-count" end)

    base ++ [{"x-retry-count", :long, next_retry_count}]
  end
end
