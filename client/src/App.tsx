import { useEffect, useState } from "react";
import { api } from "./lib/api.js";

type Health = { ok: boolean; uptime: number; ts: string };

type Status =
  | { state: "loading" }
  | { state: "ok"; data: Health }
  | { state: "error"; message: string };

export default function App() {
  const [status, setStatus] = useState<Status>({ state: "loading" });

  useEffect(() => {
    let cancelled = false;

    api<Health>("/health")
      .then((data) => {
        if (!cancelled) setStatus({ state: "ok", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStatus({
            state: "error",
            message: err instanceof Error ? err.message : "Unknown error",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <h1>Resume Coach</h1>
      <p>
        API status:{" "}
        {status.state === "loading" && "checking..."}
        {status.state === "ok" && `connected (up ${Math.round(status.data.uptime)}s)`}
        {status.state === "error" && `unreachable — ${status.message}`}
      </p>
    </main>
  );
}
