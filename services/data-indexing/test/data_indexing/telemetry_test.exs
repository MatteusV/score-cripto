defmodule DataIndexing.TelemetryTest do
  use ExUnit.Case, async: false

  import Mox

  alias DataIndexing.Broadway.Pipeline
  alias DataIndexing.Cache.WalletContext
  alias DataIndexing.Meilisearch.{Client, MockClient}
  alias DataIndexing.Search

  setup :set_mox_global
  setup :verify_on_exit!

  setup do
    handler_id = "telemetry-test-#{System.unique_integer([:positive])}"
    test_pid = self()

    :telemetry.attach_many(
      handler_id,
      [
        [:data_indexing, :cache, :hit],
        [:data_indexing, :cache, :miss],
        [:data_indexing, :meilisearch, :request],
        [:data_indexing, :broadway, :message, :processed],
        [:data_indexing, :broadway, :message, :failed],
        [:data_indexing, :search, :request],
        [:data_indexing, :search, :results]
      ],
      fn event, measurements, metadata, _config ->
        send(test_pid, {:telemetry_event, event, measurements, metadata})
      end,
      nil
    )

    on_exit(fn ->
      :telemetry.detach(handler_id)
    end)

    :ok
  end

  test "wallet context cache emits hit and miss events" do
    WalletContext.clear()
    assert :miss = WalletContext.get("ethereum", "0xmissing")

    assert_receive {:telemetry_event, [:data_indexing, :cache, :miss], %{count: 1},
                    %{chain: "ethereum"}}

    :ok = WalletContext.put("ethereum", "0xabc", %{"chain" => "ethereum", "address" => "0xabc"})
    assert {:ok, _ctx} = WalletContext.get("ethereum", "0xabc")

    assert_receive {:telemetry_event, [:data_indexing, :cache, :hit], %{count: 1},
                    %{address: "0xabc"}}
  end

  test "meilisearch client emits request duration telemetry" do
    original = Application.get_env(:data_indexing, :req_test_mode, false)
    Application.put_env(:data_indexing, :req_test_mode, true)

    on_exit(fn ->
      Application.put_env(:data_indexing, :req_test_mode, original)
    end)

    Req.Test.stub(Client, fn conn ->
      conn
      |> Plug.Conn.put_resp_content_type("application/json")
      |> Plug.Conn.send_resp(200, Jason.encode!(%{"status" => "available"}))
    end)

    assert {:ok, %{"status" => "available"}} = Client.health()

    assert_receive {:telemetry_event, [:data_indexing, :meilisearch, :request], measurements,
                    %{operation: :health}}

    assert is_integer(measurements.duration)
  end

  test "broadway emits processed and failed telemetry" do
    start_supervised!(
      {Pipeline,
       name: Pipeline,
       producer_module: Broadway.DummyProducer,
       meilisearch_client: MockClient,
       cache: WalletContext,
       index_name: "wallets_test",
       batch_size: 5,
       batch_timeout: 50}
    )

    expect(MockClient, :add_documents, fn "wallets_test", [_document] ->
      {:ok, %{"taskUid" => 1}}
    end)

    success_ref =
      Broadway.test_message(
        Pipeline,
        Jason.encode!(%{
          "event" => "wallet.score.calculated",
          "data" => %{
            "processId" => "proc-1",
            "chain" => "ethereum",
            "address" => "0xabc",
            "score" => 80,
            "confidence" => 0.9
          }
        })
      )

    assert_receive {:ack, ^success_ref, _successful, _failed}

    assert_receive {:telemetry_event, [:data_indexing, :broadway, :message, :processed],
                    %{count: 1}, %{event_type: "wallet.score.calculated"}}

    failure_ref = Broadway.test_message(Pipeline, Jason.encode!(%{"event" => "wallet.unknown"}))
    assert_receive {:ack, ^failure_ref, _successful, _failed}

    assert_receive {:telemetry_event, [:data_indexing, :broadway, :message, :failed], %{count: 1},
                    %{event_type: "wallet.unknown"}}
  end

  test "search emits duration and result count telemetry" do
    original_client = Application.get_env(:data_indexing, :meilisearch_client)
    Application.put_env(:data_indexing, :meilisearch_client, MockClient)

    on_exit(fn ->
      Application.put_env(:data_indexing, :meilisearch_client, original_client)
    end)

    expect(MockClient, :search, fn "wallets_test", "eth", _opts ->
      {:ok, %{"hits" => [%{"id" => "a"}], "estimatedTotalHits" => 1, "processingTimeMs" => 4}}
    end)

    assert {:ok, %{"total" => 1}} = Search.search(%{"q" => "eth"})

    assert_receive {:telemetry_event, [:data_indexing, :search, :request], measurements,
                    %{endpoint: "/api/search"}}

    assert is_integer(measurements.duration)

    assert_receive {:telemetry_event, [:data_indexing, :search, :results], %{count: 1},
                    %{endpoint: "/api/search"}}
  end
end
