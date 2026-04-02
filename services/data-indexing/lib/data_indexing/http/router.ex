defmodule DataIndexing.HTTP.Router do
  @moduledoc """
  HTTP API for querying indexed wallet documents.
  """

  use Plug.Router

  alias DataIndexing.Search

  plug(Plug.Logger)
  plug(:match)
  plug(Plug.Parsers, parsers: [:json], pass: ["application/json"], json_decoder: Jason)
  plug(:dispatch)

  get "/api/search" do
    with {:ok, payload} <- Search.search(conn.params) do
      json(conn, 200, payload)
    else
      {:error, reason} -> json(conn, 503, %{"error" => inspect(reason)})
    end
  end

  get "/api/wallets/:chain/:address" do
    case Search.get_wallet(chain, address) do
      {:ok, wallet} -> json(conn, 200, %{"wallet" => wallet})
      {:error, :not_found} -> json(conn, 404, %{"error" => "wallet_not_found"})
      {:error, reason} -> json(conn, 503, %{"error" => inspect(reason)})
    end
  end

  get "/api/stats" do
    with {:ok, payload} <- Search.stats() do
      json(conn, 200, payload)
    else
      {:error, reason} -> json(conn, 503, %{"error" => inspect(reason)})
    end
  end

  get "/api/health" do
    {:ok, payload} = Search.health()
    status = if payload["status"] == "healthy", do: 200, else: 503
    json(conn, status, payload)
  end

  match _ do
    json(conn, 404, %{"error" => "not_found"})
  end

  def child_spec(opts \\ []) do
    port = Keyword.get(opts, :port, DataIndexing.Config.port())

    Plug.Cowboy.child_spec(
      scheme: :http,
      plug: __MODULE__,
      options: [port: port]
    )
  end

  defp json(conn, status, payload) do
    body = Jason.encode!(payload)

    conn
    |> Plug.Conn.put_resp_content_type("application/json")
    |> Plug.Conn.send_resp(status, body)
  end
end
