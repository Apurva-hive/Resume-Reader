import { Router } from "express";
import { AppError, NotFoundError } from "../lib/errors.js";
import { analysisStore, analyzeRequestSchema } from "../schemas/analysis.js";
import { documentStore } from "../schemas/document.js";
import { scoreResume } from "../services/analysis.js";

export const analysisRouter = Router();

analysisRouter.post("/", async (req, res) => {
  const { resumeId, jobDescriptionId } = analyzeRequestSchema.parse(req.body);

  const resume = await documentStore.get(resumeId);
  if (!resume) throw new NotFoundError("Resume");

  const jobDescription = await documentStore.get(jobDescriptionId);
  if (!jobDescription) throw new NotFoundError("Job description");

  if (resume.kind !== "resume") {
    throw new AppError("resumeId does not point to a resume", 422, "WRONG_KIND");
  }
  if (jobDescription.kind !== "job_description") {
    throw new AppError("jobDescriptionId does not point to a job description", 422, "WRONG_KIND");
  }

  const { score, usage} = await scoreResume(resume.text, jobDescription.text);
  const saved = await analysisStore.create({
    resumeId,
    jobDescriptionId,
    overallScore: score.overallScore,
    result: score,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    latencyMs: usage.latencyMs,
  });

  res.status(201).json({ analysis: saved });      
});

analysisRouter.get("/:id", async (req, res) => {
  const analysis = await analysisStore.get(req.params.id);
  if (!analysis) throw new NotFoundError("Analysis");
  res.json({ analysis });
});

analysisRouter.get("/resume/:resumeId", async (req, res) => {
  res.json({ analyses: await analysisStore.listForResume(req.params.resumeId) });
});