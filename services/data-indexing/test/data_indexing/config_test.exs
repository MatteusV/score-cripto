defmodule DataIndexing.ConfigTest do
  use ExUnit.Case, async: true

  alias DataIndexing.Config

  describe "meilisearch_url/0" do
    test "returns configured Meilisearch URL" do
      url = Config.meilisearch_url()
      assert is_binary(url)
      assert String.starts_with?(url, "http")
    end
  end

  describe "meilisearch_index/0" do
    test "returns configured index name" do
      assert Config.meilisearch_index() == "wallets_test"
    end
  end

  describe "meilisearch_api_key/0" do
    test "returns configured API key" do
      key = Config.meilisearch_api_key()
      assert is_binary(key)
    end
  end

  describe "rabbitmq_url/0" do
    test "returns configured RabbitMQ URL" do
      url = Config.rabbitmq_url()
      assert is_binary(url)
      assert String.starts_with?(url, "amqp://")
    end
  end

  describe "port/0" do
    test "returns configured port as integer" do
      port = Config.port()
      assert is_integer(port)
      assert port > 0
    end
  end

  describe "cache_ttl_minutes/0" do
    test "returns configured cache TTL as integer" do
      ttl = Config.cache_ttl_minutes()
      assert is_integer(ttl)
      assert ttl > 0
    end
  end

  describe "endpoint_enabled?/0 and consumer_enabled?/0" do
    test "return booleans for service toggles" do
      assert Config.endpoint_enabled?() == false
      assert Config.consumer_enabled?() == false
    end
  end
end
