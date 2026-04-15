import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
  SCORE_VALIDITY_HOURS: z.coerce.number().int().positive().default(24),
  HEALTH_PORT: z.coerce.number().int().positive().default(3002),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  const missing = Object.entries(errors)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
    .join("\n");
  throw new Error(
    `[process-data-ia] Invalid environment variables:\n${missing}`
  );
}

export const config = {
  databaseUrl: parsed.data.DATABASE_URL,
  rabbitmqUrl: parsed.data.RABBITMQ_URL,
  scoreValidityHours: parsed.data.SCORE_VALIDITY_HOURS,
  healthPort: parsed.data.HEALTH_PORT,
} as const;
