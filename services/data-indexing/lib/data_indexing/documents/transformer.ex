defmodule DataIndexing.Documents.Transformer do
  @moduledoc """
  Transforms event payloads into Meilisearch-indexable documents.

  Handles two event types:
  - `wallet.score.calculated` — score results from the AI scoring pipeline
  - `wallet.data.cached` — wallet context data from on-chain analysis

  All functions are pure and stateless.
  """

  @evm_chains ~w(ethereum polygon arbitrum optimism base avalanche bsc)

  @wallet_context_fields ~w(
    tx_count total_volume unique_counterparties wallet_age_days
    largest_tx_ratio avg_tx_value has_mixer_interaction has_sanctioned_interaction
    token_diversity nft_activity defi_interactions risk_flags
  )

  @doc """
  Generates a deterministic document ID from chain and address.

  Both chain and address are lowercased to ensure consistency.
  """
  @spec document_id(String.t(), String.t()) :: String.t()
  def document_id(chain, address) do
    "#{String.downcase(chain)}_#{String.downcase(address)}"
  end

  @doc """
  Normalizes an address based on chain rules.

  EVM chains (ethereum, polygon, arbitrum, optimism, base, avalanche, bsc)
  are lowercased. All other chains preserve the original case.
  """
  @spec normalize_address(String.t(), String.t()) :: String.t()
  def normalize_address(chain, address) when chain in @evm_chains do
    String.downcase(address)
  end

  def normalize_address(_chain, address), do: address

  @doc """
  Transforms score event data into a Meilisearch document (score-only).

  Wallet context fields are set to nil.
  """
  @spec from_score_event(map()) :: {:ok, map()} | {:error, atom()}
  def from_score_event(score_data) do
    from_score_event(score_data, nil)
  end

  @doc """
  Transforms a wallet.data.cached event payload into a partial Meilisearch document.

  Only wallet context fields are populated; score fields are omitted so that
  Meilisearch merges this partial document with a later score upsert.
  """
  @spec from_data_cached_event(map()) :: {:ok, map()} | {:error, atom()}
  def from_data_cached_event(%{"walletContext" => wallet_context}) when is_map(wallet_context) do
    chain = Map.get(wallet_context, "chain")
    address = Map.get(wallet_context, "address")

    cond do
      is_nil(chain) or chain == "" -> {:error, :missing_chain}
      is_nil(address) or address == "" -> {:error, :missing_address}
      true ->
        doc =
          %{
            "id" => document_id(chain, address),
            "chain" => chain,
            "address" => address,
            "indexed_at" => DateTime.utc_now() |> DateTime.to_iso8601()
          }
          |> merge_wallet_context(wallet_context)

        {:ok, doc}
    end
  end

  def from_data_cached_event(_data), do: {:error, :invalid_wallet_context}

  @spec from_score_event(map(), map() | nil) :: {:ok, map()} | {:error, atom()}
  def from_score_event(score_data, wallet_context) do
    with :ok <- validate_required(score_data),
         :ok <- validate_score(score_data["score"]),
         :ok <- validate_confidence(score_data["confidence"]) do
      chain = score_data["chain"]
      address = score_data["address"]

      doc =
        %{
          "id" => document_id(chain, address),
          "chain" => chain,
          "address" => address,
          "score" => score_data["score"],
          "confidence" => score_data["confidence"],
          "reasoning" => Map.get(score_data, "reasoning"),
          "positive_factors" => Map.get(score_data, "positiveFactors"),
          "risk_factors" => Map.get(score_data, "riskFactors"),
          "model_version" => score_data["modelVersion"],
          "prompt_version" => score_data["promptVersion"],
          "request_id" => score_data["requestId"],
          "indexed_at" => DateTime.utc_now() |> DateTime.to_iso8601()
        }
        |> merge_wallet_context(wallet_context)

      {:ok, doc}
    end
  end

  defp validate_required(data) do
    cond do
      is_nil(data["chain"]) or data["chain"] == "" -> {:error, :missing_chain}
      is_nil(data["address"]) or data["address"] == "" -> {:error, :missing_address}
      is_nil(data["score"]) -> {:error, :missing_score}
      true -> :ok
    end
  end

  defp validate_score(score) when is_number(score) and score >= 0 and score <= 100, do: :ok
  defp validate_score(_), do: {:error, :invalid_score}

  defp validate_confidence(nil), do: :ok

  defp validate_confidence(confidence)
       when is_number(confidence) and confidence >= 0 and confidence <= 1,
       do: :ok

  defp validate_confidence(_), do: {:error, :invalid_confidence}

  defp merge_wallet_context(doc, nil) do
    Enum.reduce(@wallet_context_fields, doc, fn field, acc ->
      Map.put(acc, field, nil)
    end)
  end

  defp merge_wallet_context(doc, wallet_context) when is_map(wallet_context) do
    Enum.reduce(@wallet_context_fields, doc, fn field, acc ->
      Map.put(acc, field, Map.get(wallet_context, field))
    end)
  end
end
