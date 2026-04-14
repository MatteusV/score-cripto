defmodule DataIndexing.Broadway.Pipeline do
  @moduledoc """
  Broadway pipeline that consumes wallet events from RabbitMQ and indexes
  score documents in Meilisearch via idempotent partial upserts.

  Both `wallet.data.cached` and `wallet.score.calculated` events are indexed
  as partial documents. Meilisearch merges them by primary key (`id`), making
  the pipeline resilient to message reorder and restarts without any ETS join.
  """

  use Broadway

  require Logger

  alias Broadway.Message
  alias DataIndexing.{Config, Documents.Transformer, Meilisearch, Telemetry}

  def start_link(opts \\ []) do
    name = Keyword.get(opts, :name, __MODULE__)

    Broadway.start_link(__MODULE__,
      name: name,
      context: %{
        meilisearch_client: Keyword.get(opts, :meilisearch_client, Meilisearch.client()),
        index_name: Keyword.get(opts, :index_name, Config.meilisearch_index())
      },
      producer: producer_options(opts),
      processors: [default: [concurrency: Keyword.get(opts, :processor_concurrency, 2)]],
      batchers: [
        index: [
          concurrency: 1,
          batch_size: Keyword.get(opts, :batch_size, Config.broadway_batch_size()),
          batch_timeout: Keyword.get(opts, :batch_timeout, Config.broadway_batch_timeout_ms())
        ]
      ]
    )
  end

  @impl true
  def handle_message(_processor, %Message{} = message, _context) do
    case Jason.decode(message.data) do
      {:ok, %{"event" => "wallet.data.cached", "data" => data}} ->
        Logger.info("RECEBIDO: wallet.data.cached")
        handle_wallet_cached(message, data)

      {:ok, %{"event" => "wallet.score.calculated", "data" => data}} ->
        Logger.info("RECEBIDO: wallet.score.calculated")
        handle_score_calculated(message, data)

      {:ok, %{"event" => event_type}} ->
        message
        |> tag_event(event_type)
        |> Message.configure_ack(on_failure: :reject)
        |> Message.failed(:unknown_event)

      {:error, reason} ->
        message
        |> tag_event("invalid_json")
        |> Message.configure_ack(on_failure: :reject)
        |> Message.failed(reason)
    end
  end

  @impl true
  def handle_batch(:index, messages, _batch_info, context) do
    documents = Enum.map(messages, & &1.data.document)

    case context.meilisearch_client.update_documents(context.index_name, documents) do
      {:ok, _task} ->
        Telemetry.indexed_documents(context.index_name, length(documents))
        messages

      {:error, reason} ->
        Enum.map(messages, fn message ->
          message
          |> Message.configure_ack(on_failure: :reject_and_requeue_once)
          |> Message.failed({:meilisearch_unavailable, reason})
        end)
    end
  end

  @impl true
  def handle_failed(messages, _context) do
    Enum.each(messages, fn message ->
      Telemetry.broadway_failed(message.metadata[:event_type] || "unknown", message.status)
    end)

    messages
  end

  defp handle_wallet_cached(message, data) do
    case Transformer.from_data_cached_event(data) do
      {:ok, document} ->
        Telemetry.broadway_processed("wallet.data.cached", :indexed)

        message
        |> tag_event("wallet.data.cached")
        |> Map.put(:data, %{document: document})
        |> Message.put_batcher(:index)

      {:error, reason} ->
        message
        |> tag_event("wallet.data.cached")
        |> Message.configure_ack(on_failure: :reject)
        |> Message.failed(reason)
    end
  end

  defp handle_score_calculated(message, score_data) do
    case Transformer.from_score_event(score_data) do
      {:ok, document} ->
        Telemetry.broadway_processed("wallet.score.calculated", :indexed)

        message
        |> tag_event("wallet.score.calculated")
        |> Map.put(:data, %{document: document})
        |> Message.put_batcher(:index)

      {:error, reason} ->
        message
        |> tag_event("wallet.score.calculated")
        |> Message.configure_ack(on_failure: :reject)
        |> Message.failed(reason)
    end
  end

  defp tag_event(message, event_type) do
    %{message | metadata: Map.put(message.metadata, :event_type, event_type)}
  end

  defp producer_options(opts) do
    case Keyword.get(opts, :producer_module) do
      nil ->
        exchange = Keyword.get(opts, :exchange, Config.rabbitmq_exchange())

        [
          module: {
            BroadwayRabbitMQ.Producer,
            queue: Keyword.get(opts, :queue, Config.rabbitmq_queue()),
            connection: Keyword.get(opts, :connection, Config.rabbitmq_connection_options()),
            bindings:
              Enum.map(Config.rabbitmq_routing_keys(), fn routing_key ->
                {exchange, [routing_key: routing_key]}
              end),
            after_connect: &declare_exchange_and_dlq(&1, exchange, Keyword.get(opts, :queue, Config.rabbitmq_queue())),
            declare: [
              durable: true,
              arguments: DataIndexing.Broadway.DlqTopology.queue_arguments(Keyword.get(opts, :queue, Config.rabbitmq_queue()))
            ],
            on_failure: :reject_and_requeue_once,
            qos: [prefetch_count: 10]
          },
          concurrency: 1
        ]

      producer_module ->
        [
          module: {producer_module, Keyword.get(opts, :producer_options, [])},
          concurrency: 1
        ]
    end
  end

  defp declare_exchange(channel, exchange) do
    case AMQP.Exchange.declare(channel, exchange, :topic, durable: true) do
      :ok ->
        :ok

      {:error, reason} ->
        Logger.error("failed to declare rabbitmq exchange #{exchange}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp declare_exchange_and_dlq(channel, exchange, source_queue) do
    with :ok <- declare_exchange(channel, exchange),
         :ok <- DataIndexing.Broadway.DlqTopology.declare_dlq_for(channel, source_queue) do
      :ok
    else
      {:error, reason} ->
        Logger.error("failed to declare DLQ topology for #{source_queue}: #{inspect(reason)}")
        {:error, reason}
    end
  end
end
