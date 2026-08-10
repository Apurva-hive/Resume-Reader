import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:5173"),

  // Added in M2 — kept optional so the server still boots without it.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  LLM_MODEL: z.string().default("claude-sonnet-5"),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  // Added in M1/M5.
  DATABASE_URL: z.string().url(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
