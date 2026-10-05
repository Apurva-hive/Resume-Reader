const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type StreamHandlers = {
  onDelta: (text: string) => void;
  onDone: (info: { length: number; truncated?: boolean }) => void;
  onError: (message: string) => void;
};

export async function streamPost(
  path: string,
  body: unknown,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = (await res.json()) as { error?: { message?: string } };
      message = data.error?.message ?? message;
    } catch {
      // non-JSON body; keep the status text
    }
    handlers.onError(message);
    return;
  }

  if (!res.body) {
    handlers.onError("No response body");
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Frames are separated by a blank line. A network chunk can split a frame
    // in half, so anything after the last blank line stays in the buffer.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      let event = "message";
      let data = "";

      for (const line of frame.split("\n")) {
        if (line.startsWith(":")) continue; // keep-alive comment
        if (line.startsWith("event: ")) event = line.slice(7).trim();
        else if (line.startsWith("data: ")) data += line.slice(6);
      }

      if (!data) continue;

      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === "delta") handlers.onDelta(String(parsed["text"] ?? ""));
        else if (event === "done")
          handlers.onDone({
            length: Number(parsed["length"] ?? 0),
            truncated: Boolean(parsed["truncated"]),
          });
        else if (event === "error")
          handlers.onError(String(parsed["message"] ?? "Generation failed"));
      } catch {
        // malformed frame — skip it rather than killing the stream
      }
    }
  }
}