defmodule DataIndexing.Meilisearch.Client do
  @moduledoc """
  HTTP client for Meilisearch using Req.

  Implements `DataIndexing.Meilisearch.ClientBehaviour` and supports
  stubbing via `Req.Test` for unit tests.
  """

  @behaviour DataIndexing.Meilisearch.ClientBehaviour

  require OpenTelemetry.Tracer

  alias DataIndexing.Telemetry

  @impl true
  def health do
    request(:health, fn ->
      base_req()
      |> Req.get(url: "/health")
      |> handle_response()
    end)
  end

  @impl true
  def create_index(index_uid, opts \\ %{}) do
    body = Map.merge(%{"uid" => index_uid}, opts)

    request(:create_index, fn ->
      base_req()
      |> Req.post(url: "/indexes", json: body)
      |> handle_response()
    end)
  end

  @impl true
  def get_index(index_uid) do
    request(:get_index, fn ->
      base_req()
      |> Req.get(url: "/indexes/#{index_uid}")
      |> handle_response()
    end)
  end

  @impl true
  def delete_index(index_uid) do
    request(:delete_index, fn ->
      base_req()
      |> Req.delete(url: "/indexes/#{index_uid}")
      |> handle_response()
    end)
  end

  @impl true
  def add_documents(index_uid, documents) when is_list(documents) do
    request(:add_documents, fn ->
      base_req()
      |> Req.post(url: "/indexes/#{index_uid}/documents", json: documents)
      |> handle_response()
    end)
  end

  @impl true
  def update_documents(index_uid, documents) when is_list(documents) do
    request(:update_documents, fn ->
      base_req()
      |> Req.patch(url: "/indexes/#{index_uid}/documents", json: documents)
      |> handle_response()
    end)
  end

  @impl true
  def search(index_uid, query, opts \\ %{}) do
    body = Map.merge(%{"q" => query}, opts)

    request(:search, fn ->
      base_req()
      |> Req.post(url: "/indexes/#{index_uid}/search", json: body)
      |> handle_response()
    end)
  end

  @impl true
  def update_settings(index_uid, settings) when is_map(settings) do
    request(:update_settings, fn ->
      base_req()
      |> Req.patch(url: "/indexes/#{index_uid}/settings", json: settings)
      |> handle_response()
    end)
  end

  @impl true
  def get_settings(index_uid) do
    request(:get_settings, fn ->
      base_req()
      |> Req.get(url: "/indexes/#{index_uid}/settings")
      |> handle_response()
    end)
  end

  # -- Private --

  defp base_req do
    opts = [
      base_url: DataIndexing.Config.meilisearch_url(),
      headers: [{"authorization", "Bearer #{DataIndexing.Config.meilisearch_api_key()}"}],
      retry: false
    ]

    opts =
      if Application.get_env(:data_indexing, :req_test_mode, false) do
        Keyword.put(opts, :plug, {Req.Test, __MODULE__})
      else
        opts
      end

    Req.new(opts)
  end

  defp request(operation, fun) do
    OpenTelemetry.Tracer.with_span :"meilisearch.#{operation}", %{kind: :client} do
      Telemetry.meilisearch_request(operation, fun)
    end
  end

  defp handle_response({:ok, %Req.Response{status: status, body: body}})
       when status in 200..299 do
    {:ok, body}
  end

  defp handle_response({:ok, %Req.Response{status: 401}}) do
    {:error, :unauthorized}
  end

  defp handle_response({:ok, %Req.Response{status: 404}}) do
    {:error, :not_found}
  end

  defp handle_response({:ok, %Req.Response{status: status, body: body}}) do
    {:error, {status, body}}
  end

  defp handle_response({:error, %Req.TransportError{reason: reason}}) do
    {:error, reason}
  end

  defp handle_response({:error, reason}) do
    {:error, reason}
  end
end
