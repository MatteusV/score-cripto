defmodule DataIndexing.Search do
  @moduledoc """
  Search and read operations backed by Meilisearch.
  """

  alias DataIndexing.{Config, Meilisearch, Telemetry}

  @max_per_page 100

  def search(params) do
    q = Map.get(params, "q", "")
    page = positive_integer(Map.get(params, "page"), 1)
    per_page = clamp(positive_integer(Map.get(params, "per_page"), 20), 1, @max_per_page)
    filters = build_filters(params)
    sort = build_sort(params)

    opts =
      %{
        "limit" => per_page,
        "offset" => (page - 1) * per_page
      }
      |> maybe_put("filter", filters)
      |> maybe_put("sort", sort)

    duration_start = System.monotonic_time()
    result = Meilisearch.client().search(Config.meilisearch_index(), q, opts)
    duration = System.monotonic_time() - duration_start

    case result do
      {:ok, payload} ->
        total = payload["estimatedTotalHits"] || length(payload["hits"] || [])
        Telemetry.search_request("/api/search", duration, total)

        {:ok,
         %{
           "hits" => payload["hits"] || [],
           "total" => total,
           "page" => page,
           "per_page" => per_page,
           "processing_time_ms" => payload["processingTimeMs"] || 0
         }}

      error ->
        error
    end
  end

  def get_wallet(chain, address) do
    normalized_address = DataIndexing.Documents.Transformer.normalize_address(chain, address)

    case Meilisearch.client().search(
           Config.meilisearch_index(),
           "",
           %{
             "limit" => 1,
             "filter" => [
               ~s(chain = "#{chain}"),
               ~s(address = "#{normalized_address}")
             ]
           }
         ) do
      {:ok, %{"hits" => [wallet | _]}} -> {:ok, wallet}
      {:ok, %{"hits" => []}} -> {:error, :not_found}
      error -> error
    end
  end

  def stats do
    with {:ok, payload} <-
           Meilisearch.client().search(Config.meilisearch_index(), "", %{"limit" => 1_000}) do
      hits = payload["hits"] || []
      total_wallets = payload["estimatedTotalHits"] || length(hits)

      scores =
        hits
        |> Enum.map(&Map.get(&1, "score"))
        |> Enum.filter(&is_number/1)

      avg_score =
        case scores do
          [] -> 0.0
          values -> Enum.sum(values) / length(values)
        end

      {:ok,
       %{
         "total_wallets" => total_wallets,
         "avg_score" => Float.round(avg_score, 2),
         "score_distribution" => build_score_distribution(scores),
         "chains" => count_by(hits, "chain")
       }}
    end
  end

  def health do
    meilisearch_status =
      case Meilisearch.client().health() do
        {:ok, _} -> "connected"
        {:error, _} -> "down"
      end

    rabbitmq_status =
      if Config.consumer_enabled?() do
        if Process.whereis(DataIndexing.Broadway.Pipeline), do: "connected", else: "down"
      else
        "disabled"
      end

    overall =
      if meilisearch_status == "connected" and rabbitmq_status in ["connected", "disabled"],
        do: "healthy",
        else: "degraded"

    {:ok,
     %{
       "status" => overall,
       "meilisearch" => meilisearch_status,
       "rabbitmq" => rabbitmq_status
     }}
  end

  defp build_filters(params) do
    []
    |> add_filter(Map.get(params, "chain"), &~s(chain = "#{&1}"))
    |> add_filter(Map.get(params, "min_score"), &"score >= #{&1}")
    |> add_filter(Map.get(params, "max_score"), &"score <= #{&1}")
    |> add_risk_filters(Map.get(params, "risk_flags", []))
    |> case do
      [] -> nil
      filters -> filters
    end
  end

  defp add_filter(filters, nil, _formatter), do: filters
  defp add_filter(filters, "", _formatter), do: filters
  defp add_filter(filters, value, formatter), do: filters ++ [formatter.(value)]

  defp add_risk_filters(filters, values) when is_list(values) do
    Enum.reduce(values, filters, fn value, acc ->
      acc ++ [~s(risk_flags = "#{value}")]
    end)
  end

  defp add_risk_filters(filters, value) when is_binary(value) and value != "" do
    filters ++ [~s(risk_flags = "#{value}")]
  end

  defp add_risk_filters(filters, _), do: filters

  defp build_sort(params) do
    case {Map.get(params, "sort_by"), Map.get(params, "sort_order", "desc")} do
      {nil, _} -> nil
      {"", _} -> nil
      {field, order} -> ["#{field}:#{String.downcase(order)}"]
    end
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp positive_integer(nil, default), do: default

  defp positive_integer(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, ""} when int > 0 -> int
      _ -> default
    end
  end

  defp positive_integer(value, _default) when is_integer(value) and value > 0, do: value
  defp positive_integer(_value, default), do: default

  defp clamp(value, min, _max) when value < min, do: min
  defp clamp(value, _min, max) when value > max, do: max
  defp clamp(value, _min, _max), do: value

  defp build_score_distribution(scores) do
    Enum.reduce(
      scores,
      %{"0-20" => 0, "21-40" => 0, "41-60" => 0, "61-80" => 0, "81-100" => 0},
      fn score, acc ->
        bucket =
          cond do
            score <= 20 -> "0-20"
            score <= 40 -> "21-40"
            score <= 60 -> "41-60"
            score <= 80 -> "61-80"
            true -> "81-100"
          end

        Map.update!(acc, bucket, &(&1 + 1))
      end
    )
  end

  defp count_by(hits, field) do
    Enum.reduce(hits, %{}, fn hit, acc ->
      key = Map.get(hit, field, "unknown")
      Map.update(acc, key, 1, &(&1 + 1))
    end)
  end
end
