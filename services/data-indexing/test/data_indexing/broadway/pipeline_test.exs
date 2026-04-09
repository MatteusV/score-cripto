defmodule DataIndexing.Broadway.PipelineTest do
  use ExUnit.Case, async: false

  import Mox

  alias DataIndexing.Broadway.Pipeline
  alias DataIndexing.Meilisearch.MockClient

  setup :set_mox_global
  setup :verify_on_exit!

  setup do
    start_supervised!(
      {Pipeline,
       name: Pipeline,
       producer_module: Broadway.DummyProducer,
       meilisearch_client: MockClient,
       index_name: "wallets_test",
       batch_size: 10,
       batch_timeout: 50}
    )

    %{pipeline: Pipeline}
  end

  test "wallet.data.cached indexes wallet context as partial document", %{pipeline: pipeline} do
    expect(MockClient, :update_documents, fn "wallets_test", [document] ->
      assert document["id"] == "ethereum_0xabc"
      assert document["tx_count"] == 10
      assert document["chain"] == "ethereum"
      assert document["address"] == "0xabc"
      {:ok, %{"taskUid" => 1}}
    end)

    event = %{
      "event" => "wallet.data.cached",
      "data" => %{
        "walletContext" => %{
          "chain" => "ethereum",
          "address" => "0xabc",
          "tx_count" => 10
        }
      }
    }

    ref = Broadway.test_message(pipeline, Jason.encode!(event))

    assert_receive {:ack, ^ref, successful, failed}, 1_000
    assert length(successful) == 1
    assert failed == []
  end

  test "wallet.score.calculated indexes score as partial document", %{pipeline: pipeline} do
    expect(MockClient, :update_documents, fn "wallets_test", [document] ->
      assert document["id"] == "ethereum_0xabc"
      assert document["score"] == 88
      assert document["confidence"] == 0.91
      assert document["reasoning"] == "Trusted wallet with steady activity"
      assert document["positive_factors"] == ["Old wallet", "High tx count"]
      assert document["risk_factors"] == []
      {:ok, %{"taskUid" => 1}}
    end)

    event = %{
      "event" => "wallet.score.calculated",
      "data" => %{
        "requestId" => "req-1",
        "chain" => "ethereum",
        "address" => "0xabc",
        "score" => 88,
        "confidence" => 0.91,
        "reasoning" => "Trusted wallet with steady activity",
        "positiveFactors" => ["Old wallet", "High tx count"],
        "riskFactors" => [],
        "modelVersion" => "gpt-4o-mini",
        "promptVersion" => "v1"
      }
    }

    ref = Broadway.test_message(pipeline, Jason.encode!(event))

    assert_receive {:ack, ^ref, successful, failed}, 1_000
    assert length(successful) == 1
    assert failed == []
  end

  test "invalid json is rejected", %{pipeline: pipeline} do
    ref = Broadway.test_message(pipeline, "{")

    assert_receive {:ack, ^ref, successful, failed}, 1_000
    assert successful == []
    assert length(failed) == 1
  end

  test "unknown event type is rejected", %{pipeline: pipeline} do
    ref = Broadway.test_message(pipeline, Jason.encode!(%{"event" => "wallet.unknown"}))

    assert_receive {:ack, ^ref, successful, failed}, 1_000
    assert successful == []
    assert length(failed) == 1
  end

  test "batcher groups score events into a single bulk upsert call", %{pipeline: pipeline} do
    expect(MockClient, :update_documents, fn "wallets_test", documents ->
      assert length(documents) == 2
      {:ok, %{"taskUid" => 1}}
    end)

    payloads = [
      %{
        "event" => "wallet.score.calculated",
        "data" => %{
          "requestId" => "req-1",
          "chain" => "ethereum",
          "address" => "0xabc",
          "score" => 50,
          "confidence" => 0.7
        }
      },
      %{
        "event" => "wallet.score.calculated",
        "data" => %{
          "requestId" => "req-2",
          "chain" => "polygon",
          "address" => "0xdef",
          "score" => 70,
          "confidence" => 0.8
        }
      }
    ]

    ref = Broadway.test_batch(pipeline, Enum.map(payloads, &Jason.encode!/1))

    assert_receive {:ack, ^ref, successful, failed}, 1_000
    assert length(successful) == 2
    assert failed == []
  end

  test "meilisearch failure causes the batch to fail", %{pipeline: pipeline} do
    expect(MockClient, :update_documents, fn "wallets_test", [_document] ->
      {:error, :timeout}
    end)

    event = %{
      "event" => "wallet.score.calculated",
      "data" => %{
        "requestId" => "req-1",
        "chain" => "ethereum",
        "address" => "0xabc",
        "score" => 88,
        "confidence" => 0.91
      }
    }

    ref = Broadway.test_message(pipeline, Jason.encode!(event))

    assert_receive {:ack, ^ref, successful, failed}, 1_000
    assert successful == []
    assert length(failed) == 1
  end
end
