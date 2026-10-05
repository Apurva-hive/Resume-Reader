import type { Analysis } from "../types.js";

const IMPORTANCE_LABEL: Record<string, string> = {
  critical: "Critical",
  important: "Important",
  nice_to_have: "Nice to have",
};

function scoreTone(score: number): string {
  if (score >= 85) return "score-strong";
  if (score >= 70) return "score-good";
  if (score >= 50) return "score-partial";
  return "score-weak";
}

export function ScorePanel({ analysis }: { analysis: Analysis }) {
  const { result } = analysis;

  return (
    <section className="panel">
      <div className="score-header">
        <div className={`score-badge ${scoreTone(result.overallScore)}`}>
          {result.overallScore}
        </div>
        <p className="score-summary">{result.summary}</p>
      </div>

      <div className="columns">
        <div>
          <h3>Matched ({result.matchedSkills.length})</h3>
          <ul className="skills">
            {result.matchedSkills.map((item) => (
              <li key={item.skill}>
                <strong>{item.skill}</strong>
                <span className="muted"> — {item.evidence}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Missing ({result.missingSkills.length})</h3>
          <ul className="skills">
            {result.missingSkills.map((item) => (
              <li key={item.skill}>
                <strong>{item.skill}</strong>
                <span className={`tag tag-${item.importance}`}>
                  {IMPORTANCE_LABEL[item.importance] ?? item.importance}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3>Recommendations</h3>
      <ol className="recs">
        {result.recommendations.map((rec, i) => (
          <li key={i}>{rec}</li>
        ))}
      </ol>

      <p className="muted meta">
        {analysis.model} · {analysis.inputTokens + analysis.outputTokens} tokens ·{" "}
        {(analysis.latencyMs / 1000).toFixed(1)}s
      </p>
    </section>
  );
}