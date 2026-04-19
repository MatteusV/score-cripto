export interface StripeWebhookEventRepository {
  /**
   * Registra o eventId de forma idempotente.
   * Retorna `true` se foi a primeira vez que o evento é visto,
   * `false` se já havia sido processado anteriormente.
   */
  tryRecord: (eventId: string) => Promise<boolean>;
}
