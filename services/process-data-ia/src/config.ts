export const config = {
  port: Number.parseInt(process.env.PORT ?? "3002", 10),
  databaseUrl: process.env.DATABASE_URL ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  rabbitmqUrl: process.env.RABBITMQ_URL ?? "amqp://localhost:5672",
  scoreValidityHours: Number.parseInt(
    process.env.SCORE_VALIDITY_HOURS ?? "24",
    10
  ),
} as const;
