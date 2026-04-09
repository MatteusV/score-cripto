import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  const missing = Object.entries(errors)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
    .join("\n");
  throw new Error(`[api-gateway] Invalid environment variables:\n${missing}`);
}

export const config = {
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  rabbitmqUrl: parsed.data.RABBITMQ_URL,
} as const;
