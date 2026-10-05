import { useRef, useState } from "react";
import { ApiError, api } from "../lib/api.js";
import type { DocumentKind, DocumentSummary } from "../types.js";

const MAX_BYTES = 5 * 1024 * 1024;

export function UploadPanel({ onUploaded }: { onUploaded: () => void }) {
  const [kind, setKind] = useState<DocumentKind>("resume");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is too large. Maximum size is 5 MB.");
      return;
    }

    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    setBusy(true);
    setError(null);
    try {
      await api<{ document: DocumentSummary }>("/documents", {
        method: "POST",
        body: form,
      });
      if (fileRef.current) fileRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>Upload</h2>
      <div className="row">
        <select value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
          <option value="resume">Resume</option>
          <option value="job_description">Job description</option>
        </select>
        <input type="file" ref={fileRef} accept=".pdf,.docx,.txt" />
        <button onClick={() => void submit()} disabled={busy}>
          {busy ? "Extracting..." : "Upload"}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}