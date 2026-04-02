defmodule DataIndexing.IndexManager do
  @moduledoc """
  Ensures the Meilisearch index exists with the expected settings.
  """

  use GenServer

  alias DataIndexing.{Config, Meilisearch}

  @retry_after_ms 1_000

  @settings %{
    "searchableAttributes" => [
      "address",
      "chain",
      "reasoning",
      "positive_factors",
      "risk_factors"
    ],
    "filterableAttributes" => [
      "chain",
      "score",
      "confidence",
      "has_mixer_interaction",
      "has_sanctioned_interaction",
      "risk_flags",
      "model_version"
    ],
    "sortableAttributes" => [
      "score",
      "confidence",
      "wallet_age_days",
      "tx_count",
      "total_volume",
      "indexed_at"
    ],
    "rankingRules" => ["words", "typo", "proximity", "attribute", "sort", "exactness"]
  }

  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, opts, name: Keyword.get(opts, :name, __MODULE__))
  end

  def ensure_index(server \\ __MODULE__) do
    GenServer.call(server, :ensure_index)
  end

  def settings, do: @settings

  @impl true
  def init(opts) do
    state = %{
      client: Keyword.get(opts, :client, Meilisearch.client()),
      index: Keyword.get(opts, :index, Config.meilisearch_index()),
      retry_after_ms: Keyword.get(opts, :retry_after_ms, @retry_after_ms),
      ensure_on_start: Keyword.get(opts, :ensure_on_start, true)
    }

    if state.ensure_on_start do
      {:ok, state, {:continue, :ensure_index}}
    else
      {:ok, state}
    end
  end

  @impl true
  def handle_continue(:ensure_index, state) do
    {:noreply, maybe_schedule_retry(do_ensure_index(state), state)}
  end

  @impl true
  def handle_call(:ensure_index, _from, state) do
    result = do_ensure_index(state)
    {:reply, result, maybe_schedule_retry(result, state)}
  end

  @impl true
  def handle_info(:retry_ensure_index, state) do
    {:noreply, maybe_schedule_retry(do_ensure_index(state), state)}
  end

  defp maybe_schedule_retry(:ok, state), do: state

  defp maybe_schedule_retry({:error, _reason}, state) do
    Process.send_after(self(), :retry_ensure_index, state.retry_after_ms)
    state
  end

  defp do_ensure_index(%{client: client, index: index}) do
    with :ok <- ensure_created(client, index),
         {:ok, _task} <- client.update_settings(index, @settings) do
      :ok
    end
  end

  defp ensure_created(client, index) do
    case client.get_index(index) do
      {:ok, _index} ->
        :ok

      {:error, :not_found} ->
        case client.create_index(index, %{"primaryKey" => "id"}) do
          {:ok, _task} -> :ok
          {:error, reason} -> {:error, reason}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end
end
