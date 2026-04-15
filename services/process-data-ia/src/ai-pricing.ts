/**
 * Tabela de preços de IA por modelo, em USD por token.
 *
 * Como atualizar:
 * 1. Adicione o ID exato do modelo como chave (ex: "provider/model-name")
 * 2. Informe `input` e `output` em USD por 1 token (não por 1 milhão)
 *    - Exemplo: $0.15/1M tokens de input → input: 0.000_000_15
 * 3. Consulte a página de pricing do provedor para obter os valores atuais
 * 4. Faça commit com a mensagem "chore(pricing): atualiza preços {modelo} — {data}"
 *
 * Referências:
 * - Mistral:  https://mistral.ai/technology/#pricing
 * - OpenAI:   https://openai.com/api/pricing
 */

interface ModelPrice {
  /** Custo por token de input (prompt) em USD */
  input: number;
  /** Custo por token de output (completion) em USD */
  output: number;
}

export const MODEL_PRICES: Record<string, ModelPrice> = {
  "mistral/ministral-3b": { input: 0.000_000_04, output: 0.000_000_04 },
  "gpt-4o-mini": { input: 0.000_000_15, output: 0.000_000_6 },
};
