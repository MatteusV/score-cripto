defmodule DataIndexing.Cache.WalletContext do
  @moduledoc """
  GenServer-backed ETS cache for wallet context data.

  Stores wallet context from `wallet.data.cached` events so the Broadway
  consumer can join it with `wallet.score.calculated` events later.

  Entries expire after a configurable TTL (`:cache_ttl_minutes` in app config).
  A periodic cleanup sweeps expired entries every 60 seconds.
  """

  use GenServer

  alias DataIndexing.Telemetry

  @table :wallet_context_cache
  @cleanup_interval_ms 60_000

  # --- Public API ---

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @spec put(String.t(), String.t(), map()) :: :ok
  def put(chain, address, wallet_context) do
    ensure_table!()
    inserted_at = System.monotonic_time(:millisecond)
    :ets.insert(@table, {{chain, address}, wallet_context, inserted_at})
    :ok
  end

  @spec get(String.t(), String.t()) :: {:ok, map()} | :miss
  def get(chain, address) do
    ensure_table!()

    case :ets.lookup(@table, {chain, address}) do
      [{_key, wallet_context, inserted_at}] ->
        if expired?(inserted_at) do
          Telemetry.cache_miss(chain, address)
          :miss
        else
          Telemetry.cache_hit(chain, address)
          {:ok, wallet_context}
        end

      [] ->
        Telemetry.cache_miss(chain, address)
        :miss
    end
  end

  @spec delete(String.t(), String.t()) :: :ok
  def delete(chain, address) do
    ensure_table!()
    :ets.delete(@table, {chain, address})
    :ok
  end

  @spec clear() :: :ok
  def clear do
    ensure_table!()
    :ets.delete_all_objects(@table)
    :ok
  end

  @spec size() :: non_neg_integer()
  def size do
    ensure_table!()
    :ets.info(@table, :size)
  end

  # --- GenServer Callbacks ---

  @impl true
  def init(_opts) do
    table =
      case :ets.whereis(@table) do
        :undefined -> :ets.new(@table, [:named_table, :set, :public, read_concurrency: true])
        tid -> tid
      end

    schedule_cleanup()
    {:ok, %{table: table}}
  end

  @impl true
  def handle_info(:cleanup, state) do
    sweep_expired()
    schedule_cleanup()
    {:noreply, state}
  end

  # --- Private ---

  defp schedule_cleanup do
    Process.send_after(self(), :cleanup, @cleanup_interval_ms)
  end

  defp ensure_table! do
    case :ets.whereis(@table) do
      :undefined ->
        :ets.new(@table, [:named_table, :set, :public, read_concurrency: true])
        :ok

      _tid ->
        :ok
    end
  end

  defp expired?(inserted_at) do
    ttl_ms = ttl_minutes() * 60_000
    now = System.monotonic_time(:millisecond)
    now - inserted_at >= ttl_ms
  end

  defp ttl_minutes do
    Application.get_env(:data_indexing, :cache_ttl_minutes, 30)
  end

  defp sweep_expired do
    now = System.monotonic_time(:millisecond)
    ttl_ms = ttl_minutes() * 60_000
    cutoff = now - ttl_ms

    :ets.select_delete(@table, [
      {{:_, :_, :"$1"}, [{:<, :"$1", cutoff}], [true]}
    ])
  end
end
