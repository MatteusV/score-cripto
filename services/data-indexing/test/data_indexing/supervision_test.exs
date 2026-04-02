defmodule DataIndexing.SupervisionTest do
  use ExUnit.Case, async: false

  alias DataIndexing.Broadway.Pipeline
  alias DataIndexing.Cache.WalletContext
  alias DataIndexing.IndexManager
  alias DataIndexing.Meilisearch.MockClient

  test "supervisor restarts index manager and broadway pipeline children" do
    index_name = :"index-manager-#{System.unique_integer([:positive])}"
    pipeline_name = :"pipeline-#{System.unique_integer([:positive])}"

    {:ok, _supervisor} =
      start_supervised(%{
        id: :"test-supervisor-#{System.unique_integer([:positive])}",
        start:
          {Supervisor, :start_link,
           [
             [
               {IndexManager, client: MockClient, ensure_on_start: false, name: index_name},
               {Pipeline,
                name: pipeline_name,
                producer_module: Broadway.DummyProducer,
                meilisearch_client: MockClient,
                cache: WalletContext,
                index_name: "wallets_test"}
             ],
             [strategy: :one_for_one]
           ]}
      })

    index_pid = Process.whereis(index_name)
    pipeline_pid = Process.whereis(pipeline_name)

    refute index_pid == nil
    refute pipeline_pid == nil

    Process.exit(index_pid, :kill)
    Process.exit(pipeline_pid, :kill)

    assert eventually(fn -> Process.whereis(index_name) not in [nil, index_pid] end)
    assert eventually(fn -> Process.whereis(pipeline_name) not in [nil, pipeline_pid] end)
  end

  defp eventually(fun, attempts \\ 20)

  defp eventually(fun, attempts) when attempts > 0 do
    if fun.() do
      true
    else
      Process.sleep(50)
      eventually(fun, attempts - 1)
    end
  end

  defp eventually(_fun, 0), do: false
end
