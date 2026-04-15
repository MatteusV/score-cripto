defmodule DataIndexing.Telemetry do
  @moduledoc """
  Telemetry helpers and the telemetry poller supervisor child.
  """

  use Supervisor

  def start_link(opts \\ []) do
    Supervisor.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @impl true
  def init(_opts) do
    children = [
      {:telemetry_poller, measurements: [], period: 10_000}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end

  def execute(suffix, measurements, metadata \\ %{}) when is_list(suffix) do
    :telemetry.execute([:data_indexing | suffix], measurements, metadata)
  end

  def measure(suffix, metadata, fun) when is_function(fun, 0) do
    start_time = System.monotonic_time()
    result = fun.()
    duration = System.monotonic_time() - start_time
    execute(suffix, %{duration: duration}, metadata)
    result
  end

  def cache_hit(chain, address) do
    execute([:cache, :hit], %{count: 1}, %{chain: chain, address: address})
  end

  def cache_miss(chain, address) do
    execute([:cache, :miss], %{count: 1}, %{chain: chain, address: address})
  end

  def broadway_processed(event_type, status) do
    execute([:broadway, :message, :processed], %{count: 1}, %{
      event_type: event_type,
      status: status
    })
  end

  def broadway_failed(event_type, reason) do
    execute([:broadway, :message, :failed], %{count: 1}, %{
      event_type: event_type,
      reason: inspect(reason)
    })
  end

  def broadway_retried(event_type, retry_count) do
    execute([:broadway, :message, :retried], %{count: 1}, %{
      event_type: event_type,
      retry_count: retry_count
    })
  end

  def meilisearch_request(operation, fun) when is_function(fun, 0) do
    measure([:meilisearch, :request], %{operation: operation}, fun)
  end

  def indexed_documents(index, count) do
    execute([:meilisearch, :index, :documents_count], %{count: count}, %{index: index})
  end

  def search_request(endpoint, duration, result_count) do
    execute([:search, :request], %{duration: duration}, %{endpoint: endpoint})
    execute([:search, :results], %{count: result_count}, %{endpoint: endpoint})
  end
end
