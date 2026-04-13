import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3003),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_PRIVATE_KEY: z.string().min(1, "JWT_PRIVATE_KEY is required"),
  JWT_PUBLIC_KEY: z.string().min(1, "JWT_PUBLIC_KEY is required"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default("7d"),
  RABBITMQ_URL: z.string().default("amqp://localhost:5672"),
  STRIPE_SECRET_KEY: z.string().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().default(""),
  STRIPE_FREE_PRICE_ID: z.string().default(""),
  STRIPE_PRO_PRICE_ID: z.string().default(""),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.flatten().fieldErrors;
  const missing = Object.entries(errors)
    .map(([key, msgs]) => `  ${key}: ${msgs?.join(", ")}`)
    .join("\n");
  throw new Error(`[users] Invalid environment variables:\n${missing}`);
}

export const config = {
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtPrivateKey: parsed.data.JWT_PRIVATE_KEY.replace(/\\n/g, "\n"),
  jwtPublicKey: parsed.data.JWT_PUBLIC_KEY.replace(/\\n/g, "\n"),
  jwtExpiresIn: parsed.data.JWT_EXPIRES_IN,
  refreshTokenExpiresIn: parsed.data.REFRESH_TOKEN_EXPIRES_IN,
  rabbitmqUrl: parsed.data.RABBITMQ_URL,
  stripeSecretKey: parsed.data.STRIPE_SECRET_KEY,
  stripeWebhookSecret: parsed.data.STRIPE_WEBHOOK_SECRET,
  stripeFreePriceId: parsed.data.STRIPE_FREE_PRICE_ID,
  stripeProPriceId: parsed.data.STRIPE_PRO_PRICE_ID,
  appBaseUrl: parsed.data.APP_BASE_URL,
} as const;
