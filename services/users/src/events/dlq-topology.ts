import type { Channel } from "amqplib";

export const DLX_NAME = "score-cripto.events.dlx";

export function dlqArgumentsFor(queueName: string): Record<string, string> {
  return {
    "x-dead-letter-exchange": DLX_NAME,
    "x-dead-letter-routing-key": `${queueName}.dlq`,
  };
}

export async function assertDlqForQueue(channel: Channel, queueName: string): Promise<void> {
  const dlqName = `${queueName}.dlq`;
  await channel.assertExchange(DLX_NAME, "direct", { durable: true });
  await channel.assertQueue(dlqName, { durable: true });
  await channel.bindQueue(dlqName, DLX_NAME, dlqName);
}
