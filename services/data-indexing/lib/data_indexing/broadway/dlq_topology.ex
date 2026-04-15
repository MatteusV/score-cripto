defmodule DataIndexing.Broadway.DlqTopology do
  @moduledoc """
  Declares the Dead Letter Exchange (DLX), the DLQ, and the retry topology
  for a given source queue.

  Called from the `after_connect` hook in BroadwayRabbitMQ.Producer so that the DLX
  and DLQ exist before the source queue is declared with `x-dead-letter-exchange`.
  Also called by `RetryPublisher` to declare the retry exchange and retry queue.

  ## Retry topology

      [main queue] --fail--> [RetryPublisher]
          --publish(routing_key)--> [retry exchange (topic)]
          --> [retry queue (TTL per-message)]
          --TTL expires--> [DLX: main exchange (score-cripto.events)]
          --routing_key preserved--> [main queue]  ← redeliver
  """

  @dlx_name "score-cripto.events.dlx"
  @retry_exchange_name "score-cripto.data-indexing.retry"

  def dlx_name, do: @dlx_name
  def retry_exchange_name, do: @retry_exchange_name

  def dlq_name(source_queue), do: "#{source_queue}.dlq"
  def retry_queue_name(source_queue), do: "#{source_queue}.retry"

  @doc """
  Declares the DLX (direct, durable) and the DLQ for `source_queue`, then binds them.
  Returns `:ok` on success.
  """
  def declare_dlq_for(%AMQP.Channel{} = channel, source_queue) do
    dlq = dlq_name(source_queue)

    :ok = AMQP.Exchange.declare(channel, @dlx_name, :direct, durable: true)
    {:ok, _} = AMQP.Queue.declare(channel, dlq, durable: true)
    :ok = AMQP.Queue.bind(channel, dlq, @dlx_name, routing_key: dlq)

    :ok
  end

  @doc """
  Declares the retry exchange (topic) e a retry queue com DLX apontando de volta
  para o main exchange. Mensagens expiradas na retry queue são roteadas de volta
  ao main exchange com o routing_key original, reingressando na main queue.

  Deve ser chamado pelo `RetryPublisher` no startup.
  """
  def declare_retry_topology(%AMQP.Channel{} = channel, source_queue, main_exchange) do
    retry_queue = retry_queue_name(source_queue)

    with :ok <-
           AMQP.Exchange.declare(channel, @retry_exchange_name, :topic, durable: true),
         {:ok, _} <-
           AMQP.Queue.declare(channel, retry_queue,
             durable: true,
             arguments: [
               # Quando o TTL expira, dead-letter para o main exchange
               {"x-dead-letter-exchange", :longstr, main_exchange}
               # Sem x-dead-letter-routing-key: preserva o routing_key original
             ]
           ),
         :ok <-
           AMQP.Queue.bind(channel, retry_queue, @retry_exchange_name, routing_key: "#") do
      :ok
    else
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Returns the queue `arguments` list to wire a source queue to the DLX.
  Pass this as the `arguments:` key in `declare:` when configuring BroadwayRabbitMQ.Producer.
  """
  def queue_arguments(source_queue) do
    dlq = dlq_name(source_queue)

    [
      {"x-dead-letter-exchange", :longstr, @dlx_name},
      {"x-dead-letter-routing-key", :longstr, dlq}
    ]
  end
end
