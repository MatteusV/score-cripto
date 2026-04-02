defmodule DataIndexing.Meilisearch do
  @moduledoc """
  Access point for the configured Meilisearch client implementation.
  """

  alias DataIndexing.Config

  def client do
    Config.meilisearch_client()
  end
end
