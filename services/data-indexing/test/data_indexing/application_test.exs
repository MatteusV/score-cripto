defmodule DataIndexing.ApplicationTest do
  use ExUnit.Case, async: false

  setup do
    Application.ensure_all_started(:data_indexing)
    :ok
  end

  test "application starts successfully" do
    assert {:ok, _pid} = Application.ensure_all_started(:data_indexing)
  end

  test "supervisor is running" do
    assert Process.whereis(DataIndexing.Supervisor) != nil
  end

  test "starts core children for telemetry, cache and index manager" do
    assert Process.whereis(DataIndexing.Telemetry) != nil
    assert Process.whereis(DataIndexing.Cache.WalletContext) != nil
    assert Process.whereis(DataIndexing.IndexManager) != nil
  end

  test "does not start the broadway pipeline in test env" do
    assert Process.whereis(DataIndexing.Broadway.Pipeline) == nil
  end
end
