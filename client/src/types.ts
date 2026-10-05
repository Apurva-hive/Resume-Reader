export type DocumentKind = "resume" | "job_description";

export type DocumentSummary = {
  id: string;
  kind: DocumentKind;
  title: string;
  filename: string;
  format: "pdf" | "docx" | "txt";
  wordCount: number;
  pageCount: number | null;
  warning: string | null;
  createdAt: string;
};

export type MatchedSkill = { skill: string; evidence: string };
export type MissingSkill = {
  skill: string;
  importance: "critical" | "important" | "nice_to_have";
};

export type AtsScore = {
  overallScore: number;
  summary: string;
  matchedSkills: MatchedSkill[];
  missingSkills: MissingSkill[];
  recommendations: string[];
};

export type Analysis = {
  id: string;
  resumeId: string;
  jobDescriptionId: string;
  overallScore: number;
  result: AtsScore;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  createdAt: string;
};