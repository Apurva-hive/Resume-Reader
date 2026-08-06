import { z } from "zod";

export const atsScoreSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(600),
  matchedSkills: z.array(z.object({
    skill: z.string().min(1).max(80),
    evidence: z.string().min(1).max(300),
  })).max(25),
  missingSkills: z.array(z.object({
    skill: z.string().min(1).max(80),
    importance: z.enum(["critical", "important", "nice_to_have"]),
  })).max(25),
  recommendations: z.array(z.string().min(1).max(300)).max(8),
});

export type AtsScore = z.infer<typeof atsScoreSchema>;

export const analyzeRequestSchema = z.object({
  resumeId: z.string().uuid(),
  jobDescriptionId: z.string().uuid(),
});