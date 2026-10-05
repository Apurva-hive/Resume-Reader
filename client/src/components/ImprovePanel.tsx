import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { streamPost } from "../lib/stream.js";

type Props = { resumeId: string; jobDescriptionId: string };

export function ImprovePanel({ resumeId, jobDescriptionId }: Props) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function start() {
    setText("");
    setError(null);
    setTruncated(false);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamPost(
        "/analysis/improve",
        { resumeId, jobDescriptionId },
        {
          // Functional update: deltas arrive faster than React re-renders, so
          // reading `text` directly here would drop tokens.
          onDelta: (chunk) => setText((prev) => prev + chunk),
          onDone: (info) => setTruncated(Boolean(info.truncated)),
          onError: (message) => setError(message),
        },
        controller.signal
      );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) {
        setError(err instanceof Error ? err.message : "Stream failed");
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  return (
    <section className="panel">
      <div className="row">
        <h2>Suggested rewrites</h2>
        {streaming ? (
          <button onClick={stop}>Stop</button>
        ) : (
          <button onClick={() => void start()}>
            {text ? "Regenerate" : "Generate"}
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}
      {truncated && <p className="warn">The response was cut off before finishing.</p>}

      {text && (
        <div className="markdown">
          <ReactMarkdown>{text}</ReactMarkdown>
          {streaming && <span className="cursor" />}
        </div>
      )}

      {!text && streaming && <p className="muted">Thinking...</p>}
    </section>
  );
}