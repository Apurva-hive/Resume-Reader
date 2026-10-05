import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../env.js";
import { AppError } from "../../lib/errors.js";
import { logger } from "../../lib/logger.js";

export const client = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
  maxRetries: 0, // we retry ourselves so we can log each attempt
});

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export type CompleteOptions = {
  system: string;
  user: string;
  maxTokens?: number;
  task: string;
};

export type CompleteResult = {
  text: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
};

export async function complete(opts: CompleteOptions): Promise<CompleteResult> {
  const model = env.LLM_MODEL;
  const started = Date.now();

  const message = await withRetries(opts.task, () =>
    client.messages.create(
      {
        model,
        max_tokens: opts.maxTokens ?? 2000,
        system: opts.system,
        messages: [{ role: "user", content: opts.user }],
      },
      { timeout: env.LLM_TIMEOUT_MS }
    )
  );

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const inputTokens = message.usage.input_tokens;
  const outputTokens = message.usage.output_tokens;
  const price = PRICING[model];
  const costUsd = price
    ? (inputTokens / 1e6) * price.input + (outputTokens / 1e6) * price.output
    : 0;
  const latencyMs = Date.now() - started;

  logger.info(
    {
      task: opts.task, model, inputTokens, outputTokens,
      costUsd: Number(costUsd.toFixed(5)), latencyMs,
      stopReason: message.stop_reason,
    },
    "llm call"
  );

  if (message.stop_reason === "max_tokens") {
    throw new AppError(
      "The model's response was cut off. Try a shorter document.",
      502, "LLM_TRUNCATED"
    );
  }

  return { text, inputTokens, outputTokens, costUsd, latencyMs };
}

async function withRetries<T>(task: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const status = err instanceof Anthropic.APIError ? err.status : undefined;

      const retryable =
        status === undefined || status === 429 || (status >= 500 && status < 600);

      if (!retryable || attempt === attempts) break;

      const delay = 500 * 2 ** (attempt - 1) + Math.random() * 250;
      logger.warn({ task, attempt, status, delay }, "llm call failed, retrying");
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw toAppError(lastError);
}

function toAppError(err: unknown): AppError {
  if (err instanceof Anthropic.APIError) {
    if (err.status === 401) {
      return new AppError("The AI service rejected our credentials.", 500, "LLM_AUTH");
    }
    if (err.status === 429) {
      return new AppError("The AI service is rate limiting us. Try again shortly.", 429, "LLM_RATE_LIMIT");
    }
    return new AppError("The AI service is unavailable. Try again shortly.", 502, "LLM_UNAVAILABLE");
  }

  logger.error({ err }, "unexpected llm error");
  return new AppError("The analysis failed unexpectedly.", 502, "LLM_ERROR");
}