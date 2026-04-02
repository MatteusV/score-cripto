defmodule DataIndexing.Meilisearch.ClientTest do
  use ExUnit.Case, async: true

  alias DataIndexing.Meilisearch.Client

  setup do
    original = Application.get_env(:data_indexing, :req_test_mode, false)
    Application.put_env(:data_indexing, :req_test_mode, true)

    on_exit(fn ->
      Application.put_env(:data_indexing, :req_test_mode, original)
    end)

    :ok
  end

  describe "health/0" do
    test "returns {:ok, map} when meilisearch is healthy" do
      Req.Test.stub(Client, fn conn ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(200, Jason.encode!(%{"status" => "available"}))
      end)

      assert {:ok, %{"status" => "available"}} = Client.health()
    end

    test "returns {:error, reason} on connection error" do
      Req.Test.stub(Client, fn conn ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(503, Jason.encode!(%{"message" => "Service Unavailable"}))
      end)

      assert {:error, _reason} = Client.health()
    end
  end

  describe "create_index/2" do
    test "returns {:ok, task_map} with valid uid" do
      Req.Test.stub(Client, fn conn ->
        {:ok, body, conn} = Plug.Conn.read_body(conn)
        decoded = Jason.decode!(body)
        assert decoded["uid"] == "wallets"
        assert decoded["primaryKey"] == "id"

        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          202,
          Jason.encode!(%{
            "taskUid" => 1,
            "indexUid" => "wallets",
            "status" => "enqueued",
            "type" => "indexCreation"
          })
        )
      end)

      assert {:ok,
              %{
                "taskUid" => 1,
                "indexUid" => "wallets",
                "status" => "enqueued",
                "type" => "indexCreation"
              }} = Client.create_index("wallets", %{"primaryKey" => "id"})
    end
  end

  describe "get_index/1" do
    test "returns {:ok, index_info} when index exists" do
      Req.Test.stub(Client, fn conn ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          200,
          Jason.encode!(%{
            "uid" => "wallets",
            "primaryKey" => "id",
            "createdAt" => "2024-01-01T00:00:00Z",
            "updatedAt" => "2024-01-01T00:00:00Z"
          })
        )
      end)

      assert {:ok, %{"uid" => "wallets", "primaryKey" => "id"}} = Client.get_index("wallets")
    end

    test "returns {:error, :not_found} when index does not exist" do
      Req.Test.stub(Client, fn conn ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          404,
          Jason.encode!(%{"message" => "Index `unknown` not found.", "code" => "index_not_found"})
        )
      end)

      assert {:error, :not_found} = Client.get_index("unknown")
    end
  end

  describe "delete_index/1" do
    test "returns {:ok, task_map} on success" do
      Req.Test.stub(Client, fn conn ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          202,
          Jason.encode!(%{
            "taskUid" => 2,
            "indexUid" => "wallets",
            "status" => "enqueued",
            "type" => "indexDeletion"
          })
        )
      end)

      assert {:ok, %{"taskUid" => 2, "status" => "enqueued"}} = Client.delete_index("wallets")
    end
  end

  describe "add_documents/2" do
    test "returns {:ok, task_map} with list of documents" do
      docs = [
        %{"id" => "1", "address" => "0xabc", "score" => 85},
        %{"id" => "2", "address" => "0xdef", "score" => 42}
      ]

      Req.Test.stub(Client, fn conn ->
        {:ok, body, conn} = Plug.Conn.read_body(conn)
        decoded = Jason.decode!(body)
        assert length(decoded) == 2

        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          202,
          Jason.encode!(%{
            "taskUid" => 3,
            "indexUid" => "wallets",
            "status" => "enqueued",
            "type" => "documentAdditionOrUpdate"
          })
        )
      end)

      assert {:ok, %{"taskUid" => 3, "type" => "documentAdditionOrUpdate"}} =
               Client.add_documents("wallets", docs)
    end
  end

  describe "search/3" do
    test "returns {:ok, search_results} with query" do
      Req.Test.stub(Client, fn conn ->
        {:ok, body, conn} = Plug.Conn.read_body(conn)
        decoded = Jason.decode!(body)
        assert decoded["q"] == "ethereum"

        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          200,
          Jason.encode!(%{
            "hits" => [%{"id" => "1", "address" => "0xabc"}],
            "estimatedTotalHits" => 1,
            "query" => "ethereum"
          })
        )
      end)

      assert {:ok, %{"hits" => [_], "estimatedTotalHits" => 1}} =
               Client.search("wallets", "ethereum", %{})
    end

    test "passes filter options correctly" do
      Req.Test.stub(Client, fn conn ->
        {:ok, body, conn} = Plug.Conn.read_body(conn)
        decoded = Jason.decode!(body)
        assert decoded["q"] == "high score"
        assert decoded["filter"] == "score > 80"
        assert decoded["limit"] == 5

        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          200,
          Jason.encode!(%{
            "hits" => [],
            "estimatedTotalHits" => 0,
            "query" => "high score"
          })
        )
      end)

      assert {:ok, %{"hits" => [], "estimatedTotalHits" => 0}} =
               Client.search("wallets", "high score", %{"filter" => "score > 80", "limit" => 5})
    end
  end

  describe "update_settings/2" do
    test "returns {:ok, task_map} on success" do
      settings = %{
        "filterableAttributes" => ["score", "chain"],
        "sortableAttributes" => ["score"]
      }

      Req.Test.stub(Client, fn conn ->
        {:ok, body, conn} = Plug.Conn.read_body(conn)
        decoded = Jason.decode!(body)
        assert decoded["filterableAttributes"] == ["score", "chain"]

        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          202,
          Jason.encode!(%{
            "taskUid" => 4,
            "indexUid" => "wallets",
            "status" => "enqueued",
            "type" => "settingsUpdate"
          })
        )
      end)

      assert {:ok, %{"taskUid" => 4, "type" => "settingsUpdate"}} =
               Client.update_settings("wallets", settings)
    end
  end

  describe "get_settings/1" do
    test "returns {:ok, settings_map} on success" do
      Req.Test.stub(Client, fn conn ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          200,
          Jason.encode!(%{
            "filterableAttributes" => ["score"],
            "sortableAttributes" => ["score"],
            "searchableAttributes" => ["*"]
          })
        )
      end)

      assert {:ok, %{"filterableAttributes" => ["score"]}} = Client.get_settings("wallets")
    end
  end

  describe "authorization" do
    test "requests include Authorization header with Bearer token" do
      Req.Test.stub(Client, fn conn ->
        auth_header =
          conn
          |> Plug.Conn.get_req_header("authorization")
          |> List.first()

        assert auth_header == "Bearer test-master-key"

        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(200, Jason.encode!(%{"status" => "available"}))
      end)

      assert {:ok, _} = Client.health()
    end
  end

  describe "error handling" do
    test "HTTP 401 returns {:error, :unauthorized}" do
      Req.Test.stub(Client, fn conn ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          401,
          Jason.encode!(%{
            "message" => "The Authorization header is missing.",
            "code" => "missing_authorization_header"
          })
        )
      end)

      assert {:error, :unauthorized} = Client.health()
    end

    test "HTTP 404 returns {:error, :not_found}" do
      Req.Test.stub(Client, fn conn ->
        conn
        |> Plug.Conn.put_resp_content_type("application/json")
        |> Plug.Conn.send_resp(
          404,
          Jason.encode!(%{"message" => "Not found", "code" => "not_found"})
        )
      end)

      assert {:error, :not_found} = Client.get_index("nonexistent")
    end
  end
end
