// ═══════════════════════════════════════════════════════════════
// Environment Configuration — validated at startup via Zod
// ═══════════════════════════════════════════════════════════════

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// ─── Schema Definition ────────────────────────────────────────

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_KEY: z.string().min(1, 'API_KEY is required'),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.coerce.number().default(0),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('gpt-4o'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),

  // Browser Automation
  BROWSER_HEADLESS: z
    .string()
    .transform((val) => val === 'true')
    .default('true'),
  BROWSER_MAX_CONTEXTS: z.coerce.number().default(3),
  SCREENSHOT_DIR: z.string().default('./screenshots'),
});

// ─── Parse & Export ───────────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// ─── Derived Config Objects ───────────────────────────────────

export const serverConfig = {
  port: env.PORT,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  apiKey: env.API_KEY,
} as const;

export const redisConfig = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  db: env.REDIS_DB,
  maxRetriesPerRequest: null, // required by BullMQ
} as const;

export const openaiConfig = {
  apiKey: env.OPENAI_API_KEY,
  model: env.OPENAI_MODEL,
} as const;

export const browserConfig = {
  headless: env.BROWSER_HEADLESS,
  maxContexts: env.BROWSER_MAX_CONTEXTS,
  screenshotDir: env.SCREENSHOT_DIR,
} as const;
