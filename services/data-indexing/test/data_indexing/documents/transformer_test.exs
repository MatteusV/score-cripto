defmodule DataIndexing.Documents.TransformerTest do
  use ExUnit.Case, async: true

  alias DataIndexing.Documents.Transformer

  @valid_score_data %{
    "processId" => "cuid-123",
    "chain" => "ethereum",
    "address" => "0xABC123",
    "score" => 75,
    "confidence" => 0.92,
    "modelVersion" => "mistral/ministral-3b",
    "promptVersion" => "v1.0"
  }

  @valid_wallet_context %{
    "chain" => "ethereum",
    "address" => "0xABC123",
    "tx_count" => 150,
    "total_volume" => 45.5,
    "unique_counterparties" => 30,
    "wallet_age_days" => 365,
    "largest_tx_ratio" => 0.15,
    "avg_tx_value" => 0.3033,
    "has_mixer_interaction" => false,
    "has_sanctioned_interaction" => false,
    "token_diversity" => 12,
    "nft_activity" => true,
    "defi_interactions" => 5,
    "risk_flags" => ["new_wallet_high_activity"]
  }

  describe "document_id/2" do
    test "generates deterministic ID as chain_address lowercase" do
      assert Transformer.document_id("ethereum", "0xABC123") == "ethereum_0xabc123"
    end

    test "handles already lowercase input" do
      assert Transformer.document_id("polygon", "0xdef456") == "polygon_0xdef456"
    end

    test "handles mixed case chain" do
      assert Transformer.document_id("Ethereum", "0xABC") == "ethereum_0xabc"
    end
  end

  describe "normalize_address/2" do
    test "lowercases EVM chain addresses" do
      for chain <- ~w(ethereum polygon arbitrum optimism base avalanche bsc) do
        assert Transformer.normalize_address(chain, "0xABC123DEF") == "0xabc123def",
               "Failed for chain: #{chain}"
      end
    end

    test "preserves Bitcoin addresses (case-sensitive)" do
      address = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
      assert Transformer.normalize_address("bitcoin", address) == address
    end

    test "preserves Solana addresses (case-sensitive)" do
      address = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
      assert Transformer.normalize_address("solana", address) == address
    end

    test "preserves unknown chain addresses" do
      address = "SomeAddress123"
      assert Transformer.normalize_address("cosmos", address) == address
    end
  end

  describe "from_score_event/1 (score-only)" do
    test "transforms valid score data into document" do
      assert {:ok, doc} = Transformer.from_score_event(@valid_score_data)

      assert doc["id"] == "ethereum_0xabc123"
      assert doc["chain"] == "ethereum"
      assert doc["address"] == "0xabc123"
      assert doc["score"] == 75
      assert doc["confidence"] == 0.92
      assert doc["model_version"] == "mistral/ministral-3b"
      assert doc["prompt_version"] == "v1.0"
      assert doc["process_id"] == "cuid-123"
    end

    test "normalizes address in output for EVM chain" do
      {:ok, doc} = Transformer.from_score_event(@valid_score_data)
      assert doc["address"] == "0xabc123"
    end

    test "sets wallet context fields to nil when not provided" do
      {:ok, doc} = Transformer.from_score_event(@valid_score_data)

      assert doc["tx_count"] == nil
      assert doc["total_volume"] == nil
      assert doc["unique_counterparties"] == nil
      assert doc["wallet_age_days"] == nil
      assert doc["largest_tx_ratio"] == nil
      assert doc["avg_tx_value"] == nil
      assert doc["has_mixer_interaction"] == nil
      assert doc["has_sanctioned_interaction"] == nil
      assert doc["token_diversity"] == nil
      assert doc["nft_activity"] == nil
      assert doc["defi_interactions"] == nil
      assert doc["risk_flags"] == nil
    end

    test "adds indexed_at timestamp in ISO8601 format" do
      {:ok, doc} = Transformer.from_score_event(@valid_score_data)

      assert is_binary(doc["indexed_at"])
      assert {:ok, _dt, _offset} = DateTime.from_iso8601(doc["indexed_at"])
    end

    test "returns {:error, :missing_chain} when chain is missing" do
      data = Map.delete(@valid_score_data, "chain")
      assert {:error, :missing_chain} = Transformer.from_score_event(data)
    end

    test "returns {:error, :missing_address} when address is missing" do
      data = Map.delete(@valid_score_data, "address")
      assert {:error, :missing_address} = Transformer.from_score_event(data)
    end

    test "returns {:error, :missing_score} when score is missing" do
      data = Map.delete(@valid_score_data, "score")
      assert {:error, :missing_score} = Transformer.from_score_event(data)
    end

    test "returns {:error, :invalid_score} when score < 0" do
      data = Map.put(@valid_score_data, "score", -1)
      assert {:error, :invalid_score} = Transformer.from_score_event(data)
    end

    test "returns {:error, :invalid_score} when score > 100" do
      data = Map.put(@valid_score_data, "score", 101)
      assert {:error, :invalid_score} = Transformer.from_score_event(data)
    end

    test "returns {:error, :invalid_confidence} when confidence < 0" do
      data = Map.put(@valid_score_data, "confidence", -0.1)
      assert {:error, :invalid_confidence} = Transformer.from_score_event(data)
    end

    test "returns {:error, :invalid_confidence} when confidence > 1" do
      data = Map.put(@valid_score_data, "confidence", 1.1)
      assert {:error, :invalid_confidence} = Transformer.from_score_event(data)
    end
  end

  describe "from_score_event/2 (with wallet context)" do
    test "merges wallet context fields into document" do
      {:ok, doc} = Transformer.from_score_event(@valid_score_data, @valid_wallet_context)

      # Score fields
      assert doc["id"] == "ethereum_0xabc123"
      assert doc["score"] == 75
      assert doc["confidence"] == 0.92

      # Wallet context fields
      assert doc["tx_count"] == 150
      assert doc["total_volume"] == 45.5
      assert doc["unique_counterparties"] == 30
      assert doc["wallet_age_days"] == 365
      assert doc["largest_tx_ratio"] == 0.15
      assert doc["avg_tx_value"] == 0.3033
      assert doc["has_mixer_interaction"] == false
      assert doc["has_sanctioned_interaction"] == false
      assert doc["token_diversity"] == 12
      assert doc["nft_activity"] == true
      assert doc["defi_interactions"] == 5
      assert doc["risk_flags"] == ["new_wallet_high_activity"]
    end

    test "with nil wallet_context behaves like from_score_event/1" do
      {:ok, doc_without} = Transformer.from_score_event(@valid_score_data)
      {:ok, doc_with_nil} = Transformer.from_score_event(@valid_score_data, nil)

      # Remove indexed_at since timestamps will differ slightly
      doc_without = Map.delete(doc_without, "indexed_at")
      doc_with_nil = Map.delete(doc_with_nil, "indexed_at")

      assert doc_without == doc_with_nil
    end
  end
end
