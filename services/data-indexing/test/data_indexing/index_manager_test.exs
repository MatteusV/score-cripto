defmodule DataIndexing.IndexManagerTest do
  use ExUnit.Case, async: false

  import Mox

  alias DataIndexing.{IndexManager, Meilisearch.MockClient}

  setup :set_mox_global
  setup :verify_on_exit!

  test "ensure_index/1 creates the index when it does not exist and applies settings" do
    name = :"index-manager-#{System.unique_integer([:positive])}"

    expect(MockClient, :get_index, fn "wallets_test" ->
      {:error, :not_found}
    end)

    expect(MockClient, :create_index, fn "wallets_test", %{"primaryKey" => "id"} ->
      {:ok, %{"taskUid" => 1}}
    end)

    expect(MockClient, :update_settings, fn "wallets_test", settings ->
      assert settings["searchableAttributes"] == [
               "address",
               "chain",
               "reasoning",
               "positive_factors",
               "risk_factors"
             ]

      {:ok, %{"taskUid" => 2}}
    end)

    {:ok, pid} =
      start_supervised(
        {IndexManager,
         client: MockClient, index: "wallets_test", name: name, ensure_on_start: false}
      )

    assert :ok = IndexManager.ensure_index(pid)
  end

  test "ensure_index/1 is idempotent when the index already exists" do
    name = :"index-manager-#{System.unique_integer([:positive])}"

    expect(MockClient, :get_index, fn "wallets_test" ->
      {:ok, %{"uid" => "wallets_test"}}
    end)

    expect(MockClient, :update_settings, fn "wallets_test", _settings ->
      {:ok, %{"taskUid" => 1}}
    end)

    {:ok, pid} =
      start_supervised(
        {IndexManager,
         client: MockClient, index: "wallets_test", name: name, ensure_on_start: false}
      )

    assert :ok = IndexManager.ensure_index(pid)
  end

  test "ensure_index/1 returns an error when Meilisearch is unavailable" do
    name = :"index-manager-#{System.unique_integer([:positive])}"

    expect(MockClient, :get_index, fn "wallets_test" ->
      {:error, :econnrefused}
    end)

    {:ok, pid} =
      start_supervised(
        {IndexManager,
         client: MockClient,
         index: "wallets_test",
         retry_after_ms: 5_000,
         name: name,
         ensure_on_start: false}
      )

    assert {:error, :econnrefused} = IndexManager.ensure_index(pid)
  end
end
