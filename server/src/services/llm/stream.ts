import Anthropic from "@anthropic-ai/sdk";

export type StreamOptions = {
  system: string;
  user: string;
  maxTokens?: number;
  task: string;
  signal?: AbortSignal;
};

export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; inputTokens: number; outputTokens: number; latencyMs: number };

export async function* streamComplete(
  client: Anthropic,
  model: string,
  opts: StreamOptions
): AsyncGenerator<StreamEvent> {
  const started = Date.now();

  const stream = client.messages.stream(
    {
      model,
      max_tokens: opts.maxTokens ?? 3000,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
    },
    opts.signal ? { signal: opts.signal } : {}
  );

  try {
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "delta", text: event.delta.text };
      }
    }

    const final = await stream.finalMessage();

    yield {
      type: "done",
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
      latencyMs: Date.now() - started,
    };
  } finally {
    stream.abort();
  }
}