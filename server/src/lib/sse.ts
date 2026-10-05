import type { Request, Response } from "express";

export type SseStream = {
  send: (event: string, data: unknown) => void;
  close: () => void;
  readonly aborted: boolean;
};

export function openSse(req: Request, res: Response): SseStream {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  res.flushHeaders();

  let aborted = false;
  let closed = false;

  // Listen on the RESPONSE, not the request. In Express 5, req's "close"
  // fires when the request body has finished being read — immediately, for a
  // small JSON body — so using it marks every stream aborted before the first
  // token. res "close" is the real client-disconnect signal.
  res.on("close", () => {
    if (!closed) aborted = true;
  });

  const heartbeat = setInterval(() => {
    if (!closed) res.write(": keep-alive\n\n");
  }, 15_000);

  return {
    send(event, data) {
      if (closed || aborted) return;
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    close() {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      res.end();
    },
    get aborted() {
      return aborted;
    },
  };
}