defmodule DataIndexing.HTTP.RouterTest do
  use ExUnit.Case, async: false

  import Mox
  import Plug.Test

  alias DataIndexing.HTTP.Router
  alias DataIndexing.Meilisearch.MockClient

  setup :verify_on_exit!

  setup do
    original_client = Application.get_env(:data_indexing, :meilisearch_client)
    Application.put_env(:data_indexing, :meilisearch_client, MockClient)
    Application.put_env(:data_indexing, :consumer_enabled, false)

    on_exit(fn ->
      Application.put_env(:data_indexing, :meilisearch_client, original_client)
      Application.put_env(:data_indexing, :consumer_enabled, false)
    end)

    :ok
  end

  test "GET /api/search returns hits with pagination" do
    expect(MockClient, :search, fn "wallets_test", "ethereum", opts ->
      assert opts["filter"] == [~s(chain = "ethereum"), "score >= 70"]
      assert opts["limit"] == 2
      assert opts["offset"] == 0
      assert opts["sort"] == ["score:desc"]

      {:ok,
       %{
         "hits" => [%{"id" => "ethereum_0xabc", "score" => 88}],
         "estimatedTotalHits" => 1,
         "processingTimeMs" => 5
       }}
    end)

    conn =
      conn(
        :get,
        "/api/search?q=ethereum&chain=ethereum&min_score=70&page=1&per_page=2&sort_by=score&sort_order=desc"
      )
      |> Router.call([])

    assert conn.status == 200
    body = Jason.decode!(conn.resp_body)
    assert body["total"] == 1
    assert body["page"] == 1
    assert body["per_page"] == 2
    assert [%{"id" => "ethereum_0xabc"}] = body["hits"]
  end

  test "GET /api/wallets/:chain/:address returns the indexed wallet" do
    expect(MockClient, :search, fn "wallets_test", "", opts ->
      assert opts["limit"] == 1
      assert opts["filter"] == [~s(chain = "ethereum"), ~s(address = "0xabc")]
      {:ok, %{"hits" => [%{"id" => "ethereum_0xabc", "address" => "0xabc"}]}}
    end)

    conn =
      conn(:get, "/api/wallets/ethereum/0xABC")
      |> Router.call([])

    assert conn.status == 200
    body = Jason.decode!(conn.resp_body)
    assert body["wallet"]["address"] == "0xabc"
  end

  test "GET /api/wallets/:chain/:address returns 404 when missing" do
    expect(MockClient, :search, fn "wallets_test", "", _opts ->
      {:ok, %{"hits" => []}}
    end)

    conn =
      conn(:get, "/api/wallets/ethereum/0xmissing")
      |> Router.call([])

    assert conn.status == 404
  end

  test "GET /api/stats returns aggregated stats" do
    expect(MockClient, :search, fn "wallets_test", "", %{"limit" => 1_000} ->
      {:ok,
       %{
         "hits" => [
           %{"chain" => "ethereum", "score" => 80},
           %{"chain" => "ethereum", "score" => 40},
           %{"chain" => "polygon", "score" => 90}
         ],
         "estimatedTotalHits" => 3
       }}
    end)

    conn =
      conn(:get, "/api/stats")
      |> Router.call([])

    assert conn.status == 200
    body = Jason.decode!(conn.resp_body)
    assert body["total_wallets"] == 3
    assert body["avg_score"] == 70.0
    assert body["chains"] == %{"ethereum" => 2, "polygon" => 1}
    assert body["score_distribution"]["81-100"] == 1
  end

  test "GET /api/health returns healthy when meilisearch is connected" do
    Application.put_env(:data_indexing, :consumer_enabled, true)

    start_supervised!(
      {Task,
       fn ->
         Process.register(self(), DataIndexing.Broadway.Pipeline)
         Process.sleep(:infinity)
       end}
    )

    expect(MockClient, :health, fn ->
      {:ok, %{"status" => "available"}}
    end)

    conn =
      conn(:get, "/api/health")
      |> Router.call([])

    assert conn.status == 200
    body = Jason.decode!(conn.resp_body)
    assert body["status"] == "healthy"
    assert body["meilisearch"] == "connected"
    assert body["rabbitmq"] == "connected"
  end

  test "GET /api/health returns degraded when meilisearch is down" do
    expect(MockClient, :health, fn ->
      {:error, :econnrefused}
    end)

    conn =
      conn(:get, "/api/health")
      |> Router.call([])

    assert conn.status == 503
    body = Jason.decode!(conn.resp_body)
    assert body["status"] == "degraded"
    assert body["meilisearch"] == "down"
  end
end
