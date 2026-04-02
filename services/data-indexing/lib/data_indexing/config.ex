defmodule DataIndexing.Config do
  @moduledoc """
  Centralized configuration access for the DataIndexing service.
  """

  def meilisearch_url do
    Application.get_env(:data_indexing, :meilisearch_url)
  end

  def meilisearch_client do
    Application.get_env(:data_indexing, :meilisearch_client, DataIndexing.Meilisearch.Client)
  end

  def meilisearch_api_key do
    Application.get_env(:data_indexing, :meilisearch_api_key)
  end

  def meilisearch_index do
    Application.get_env(:data_indexing, :meilisearch_index, "wallets")
  end

  def rabbitmq_url do
    Application.get_env(:data_indexing, :rabbitmq_url)
  end

  def rabbitmq_connection_options do
    uri = URI.parse(rabbitmq_url())
    {username, password} = parse_userinfo(uri.userinfo)

    [
      username: username,
      password: password,
      host: uri.host || "localhost",
      port: uri.port || 5672,
      virtual_host: normalize_virtual_host(uri.path)
    ]
  end

  def rabbitmq_exchange do
    Application.get_env(:data_indexing, :rabbitmq_exchange, "score-cripto.events")
  end

  def rabbitmq_queue do
    Application.get_env(:data_indexing, :rabbitmq_queue, "data-indexing.wallet.events")
  end

  def rabbitmq_routing_keys do
    Application.get_env(:data_indexing, :rabbitmq_routing_keys, [])
  end

  def port do
    Application.get_env(:data_indexing, :port)
  end

  def cache_ttl_minutes do
    Application.get_env(:data_indexing, :cache_ttl_minutes)
  end

  def broadway_batch_size do
    Application.get_env(:data_indexing, :broadway_batch_size, 10)
  end

  def broadway_batch_timeout_ms do
    Application.get_env(:data_indexing, :broadway_batch_timeout_ms, 1_000)
  end

  def endpoint_enabled? do
    Application.get_env(:data_indexing, :endpoint_enabled, true)
  end

  def consumer_enabled? do
    Application.get_env(:data_indexing, :consumer_enabled, true)
  end

  defp parse_userinfo(nil), do: {"guest", "guest"}

  defp parse_userinfo(userinfo) do
    case String.split(userinfo, ":", parts: 2) do
      [username, password] -> {username, password}
      [username] -> {username, "guest"}
    end
  end

  defp normalize_virtual_host(nil), do: "/"
  defp normalize_virtual_host(""), do: "/"
  defp normalize_virtual_host("/"), do: "/"
  defp normalize_virtual_host(path), do: String.trim_leading(path, "/")
end
