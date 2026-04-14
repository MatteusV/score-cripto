defmodule DataIndexing.Broadway.DlqTopology do
  @moduledoc """
  Declares the Dead Letter Exchange (DLX) and the DLQ for a given source queue.

  Called from the `after_connect` hook in BroadwayRabbitMQ.Producer so that the DLX
  and DLQ exist before the source queue is declared with `x-dead-letter-exchange`.
  """

  @dlx_name "score-cripto.events.dlx"

  def dlx_name, do: @dlx_name

  def dlq_name(source_queue), do: "#{source_queue}.dlq"

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
