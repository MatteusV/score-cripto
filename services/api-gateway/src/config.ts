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
} as const;
