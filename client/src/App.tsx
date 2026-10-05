import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "./lib/api.js";
import { UploadPanel } from "./components/UploadPanel.js";
import { DocumentPicker } from "./components/DocumentPicker.js";
import { ScorePanel } from "./components/ScorePanel.js";
import { ImprovePanel } from "./components/ImprovePanel.js";
import type { Analysis, DocumentSummary } from "./types.js";

export default function App() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [jobDescriptionId, setJobDescriptionId] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [scoring, setScoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ documents: DocumentSummary[] }>("/documents");
      setDocuments(res.documents);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cannot reach the API");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function remove(id: string) {
    await api<void>(`/documents/${id}`, { method: "DELETE" });
    if (id === resumeId) setResumeId("");
    if (id === jobDescriptionId) setJobDescriptionId("");
    setAnalysis(null);
    void refresh();
  }

  async function runAnalysis() {
    setScoring(true);
    setError(null);
    setAnalysis(null);
    try {
      const res = await api<{ analysis: Analysis }>("/analysis", {
        method: "POST",
        body: JSON.stringify({ resumeId, jobDescriptionId }),
      });
      setAnalysis(res.analysis);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Analysis failed");
    } finally {
      setScoring(false);
    }
  }

  const ready = resumeId !== "" && jobDescriptionId !== "";

  return (
    <main>
      <h1>Resume Coach</h1>
      {error && <p className="error">{error}</p>}

      <UploadPanel onUploaded={() => void refresh()} />

      <section className="panel">
        <h2>Analyse</h2>
        <DocumentPicker
          label="Resume"
          kind="resume"
          documents={documents}
          value={resumeId}
          onChange={setResumeId}
          onDelete={(id) => void remove(id)}
        />
        <DocumentPicker
          label="Job description"
          kind="job_description"
          documents={documents}
          value={jobDescriptionId}
          onChange={setJobDescriptionId}
          onDelete={(id) => void remove(id)}
        />
        <button onClick={() => void runAnalysis()} disabled={!ready || scoring}>
        {scoring ? "Scoring..." : "Score this resume"}
      </button>
      {!ready && <p className="muted">Upload and select one of each to continue.</p>}
      {scoring && (
        <p className="muted">
          <span className="spinner" /> Reading both documents and comparing them —
          this usually takes 20–30 seconds.
        </p>
      )}
      </section>

      {analysis && <ScorePanel analysis={analysis} />}

      {analysis && (
        <ImprovePanel resumeId={resumeId} jobDescriptionId={jobDescriptionId} />
      )}
    </main>
  );
}