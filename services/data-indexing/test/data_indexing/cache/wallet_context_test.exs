defmodule DataIndexing.Cache.WalletContextTest do
  use ExUnit.Case, async: false

  alias DataIndexing.Cache.WalletContext

  setup do
    original_ttl = Application.get_env(:data_indexing, :cache_ttl_minutes)
    Application.put_env(:data_indexing, :cache_ttl_minutes, 5)
    WalletContext.clear()

    on_exit(fn ->
      Application.put_env(:data_indexing, :cache_ttl_minutes, original_ttl)
      WalletContext.clear()
    end)

    :ok
  end

  describe "put/3 + get/2" do
    test "returns stored wallet_context" do
      wallet_context = %{"balance" => "1.5 ETH", "tx_count" => 42}
      assert :ok = WalletContext.put("ethereum", "0xabc123", wallet_context)
      assert {:ok, ^wallet_context} = WalletContext.get("ethereum", "0xabc123")
    end
  end

  describe "get/2" do
    test "without prior put returns :miss" do
      assert :miss = WalletContext.get("ethereum", "0xnonexistent")
    end
  end

  describe "delete/3" do
    test "removes entry, subsequent get returns :miss" do
      WalletContext.put("ethereum", "0xabc123", %{"balance" => "1.0"})
      assert {:ok, _} = WalletContext.get("ethereum", "0xabc123")

      assert :ok = WalletContext.delete("ethereum", "0xabc123")
      assert :miss = WalletContext.get("ethereum", "0xabc123")
    end
  end

  describe "clear/0" do
    test "removes all entries" do
      WalletContext.put("ethereum", "0xabc", %{"a" => 1})
      WalletContext.put("bitcoin", "1BvBM", %{"b" => 2})
      assert WalletContext.size() == 2

      assert :ok = WalletContext.clear()
      assert WalletContext.size() == 0
      assert :miss = WalletContext.get("ethereum", "0xabc")
      assert :miss = WalletContext.get("bitcoin", "1BvBM")
    end
  end

  describe "size/0" do
    test "returns correct count" do
      assert WalletContext.size() == 0

      WalletContext.put("ethereum", "0x1", %{"a" => 1})
      assert WalletContext.size() == 1

      WalletContext.put("ethereum", "0x2", %{"b" => 2})
      assert WalletContext.size() == 2

      WalletContext.put("bitcoin", "1Abc", %{"c" => 3})
      assert WalletContext.size() == 3
    end
  end

  describe "put/3 with same key" do
    test "overwrites previous value" do
      WalletContext.put("ethereum", "0xabc", %{"version" => 1})
      WalletContext.put("ethereum", "0xabc", %{"version" => 2})

      assert {:ok, %{"version" => 2}} = WalletContext.get("ethereum", "0xabc")
      assert WalletContext.size() == 1
    end
  end

  describe "TTL expiration" do
    test "expired entry returns :miss on get" do
      # Override TTL to a very short value (essentially 0 minutes, we use raw ms check)
      # We'll set cache_ttl_minutes to 0 so entries expire immediately
      Application.put_env(:data_indexing, :cache_ttl_minutes, 0)

      WalletContext.put("ethereum", "0xexpired", %{"data" => "old"})
      # Sleep briefly to ensure monotonic_time advances past 0ms TTL
      Process.sleep(50)

      assert :miss = WalletContext.get("ethereum", "0xexpired")
    end
  end

  describe "multiple entries with different keys" do
    test "stores and retrieves independently" do
      ctx1 = %{"chain" => "ethereum", "balance" => "10"}
      ctx2 = %{"chain" => "bitcoin", "balance" => "0.5"}
      ctx3 = %{"chain" => "polygon", "balance" => "100"}

      WalletContext.put("ethereum", "0xaaa", ctx1)
      WalletContext.put("bitcoin", "1Bbb", ctx2)
      WalletContext.put("polygon", "0xccc", ctx3)

      assert {:ok, ^ctx1} = WalletContext.get("ethereum", "0xaaa")
      assert {:ok, ^ctx2} = WalletContext.get("bitcoin", "1Bbb")
      assert {:ok, ^ctx3} = WalletContext.get("polygon", "0xccc")

      # Deleting one doesn't affect others
      WalletContext.delete("bitcoin", "1Bbb")
      assert :miss = WalletContext.get("bitcoin", "1Bbb")
      assert {:ok, ^ctx1} = WalletContext.get("ethereum", "0xaaa")
      assert {:ok, ^ctx3} = WalletContext.get("polygon", "0xccc")
    end
  end
end
