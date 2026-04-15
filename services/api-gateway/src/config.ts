import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
  USERS_SERVICE_URL: z.string().default("http://users:3003"),
  JWT_PUBLIC_KEY: z.string().min(1, "JWT_PUBLIC_KEY is required"),
  RATE_LIMIT_MAX_AUTH: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_ANON: z.coerce.number().int().positive().default(30),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  USERS_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(1000),
  USERS_SERVICE_RETRY_ATTEMPTS: z.coerce.number().int().min(0).default(1),
  USERS_SERVICE_RETRY_BACKOFF_MS: z.coerce.number().int().min(0).default(200),
  USERS_SERVICE_BREAKER_THRESHOLD: z.coerce.number().min(0).max(1).default(0.5),
  USERS_SERVICE_BREAKER_HALF_OPEN_AFTER_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30_000),
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
  usersServiceUrl: parsed.data.USERS_SERVICE_URL,
  jwtPublicKey: parsed.data.JWT_PUBLIC_KEY.replace(/\\n/g, "\n"),
  rateLimitMaxAuth: parsed.data.RATE_LIMIT_MAX_AUTH,
  rateLimitMaxAnon: parsed.data.RATE_LIMIT_MAX_ANON,
  rateLimitWindowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
  usersServiceTimeoutMs: parsed.data.USERS_SERVICE_TIMEOUT_MS,
  usersServiceRetryAttempts: parsed.data.USERS_SERVICE_RETRY_ATTEMPTS,
  usersServiceRetryBackoffMs: parsed.data.USERS_SERVICE_RETRY_BACKOFF_MS,
  usersServiceBreakerThreshold: parsed.data.USERS_SERVICE_BREAKER_THRESHOLD,
  usersServiceBreakerHalfOpenAfterMs:
    parsed.data.USERS_SERVICE_BREAKER_HALF_OPEN_AFTER_MS,
} as const;
