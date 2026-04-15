defmodule DataIndexing.Broadway.RetryPublisherBehaviour do
  @moduledoc """
  Contrato para publicar mensagens na retry queue com backoff exponencial.
  Permite injeção de mock em testes.
  """

  @callback schedule_retry(
              payload :: binary(),
              routing_key :: String.t(),
              amqp_headers :: list(),
              retry_count :: non_neg_integer()
            ) :: :ok | {:error, :max_retries_exceeded} | {:error, term()}
end
