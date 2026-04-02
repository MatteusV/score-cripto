defmodule DataIndexing.Meilisearch.ClientBehaviour do
  @moduledoc """
  Defines the contract for Meilisearch HTTP client operations.
  """

  @callback health() :: {:ok, map()} | {:error, term()}
  @callback create_index(index_uid :: String.t(), opts :: map()) ::
              {:ok, map()} | {:error, term()}
  @callback get_index(index_uid :: String.t()) :: {:ok, map()} | {:error, term()}
  @callback delete_index(index_uid :: String.t()) :: {:ok, map()} | {:error, term()}
  @callback add_documents(index_uid :: String.t(), documents :: list(map())) ::
              {:ok, map()} | {:error, term()}
  @callback search(index_uid :: String.t(), query :: String.t(), opts :: map()) ::
              {:ok, map()} | {:error, term()}
  @callback update_settings(index_uid :: String.t(), settings :: map()) ::
              {:ok, map()} | {:error, term()}
  @callback get_settings(index_uid :: String.t()) :: {:ok, map()} | {:error, term()}
end
