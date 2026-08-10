import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { analyses, type AnalysisRow, type NewAnalysisRow } from "../db/schema.js";

export const atsScoreSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(600),
  matchedSkills: z.array(z.object({
    skill: z.string().min(1).max(80),
    evidence: z.string().min(1).max(300),
  })).max(25),
  missingSkills: z.array(z.object({
    skill: z.string().min(1).max(120),
    importance: z.enum(["critical", "important", "nice_to_have"]),
  })).max(25),
  recommendations: z.array(z.string().min(1).max(300)).max(8),
});

export type AtsScore = z.infer<typeof atsScoreSchema>;

export const analyzeRequestSchema = z.object({
  resumeId: z.string().uuid(),
  jobDescriptionId: z.string().uuid(),
});

export const analysisStore = {
  async create(row: NewAnalysisRow): Promise<AnalysisRow> {
    const [created] = await db.insert(analyses).values(row).returning();
    if (!created) throw new Error("Insert returned no row");
    return created;
  },

  async get(id: string): Promise<AnalysisRow | undefined> {
    const [row] = await db.select().from(analyses).where(eq(analyses.id, id)).limit(1);
    return row;
  },

  async listForResume(resumeId: string): Promise<AnalysisRow[]> {
    return db.select().from(analyses).where(eq(analyses.resumeId, resumeId))
      .orderBy(desc(analyses.createdAt));
  },
};