import { Router } from "express";
import { AppError, NotFoundError } from "../lib/errors.js";
import { analyzeRequestSchema } from "../schemas/analysis.js";
import { documentStore } from "../schemas/document.js";
import { scoreResume } from "../services/analysis.js";

export const analysisRouter = Router();

analysisRouter.post("/", async (req, res) => {
  const { resumeId, jobDescriptionId } = analyzeRequestSchema.parse(req.body);

  const resume = documentStore.get(resumeId);
  if (!resume) throw new NotFoundError("Resume");

  const jobDescription = documentStore.get(jobDescriptionId);
  if (!jobDescription) throw new NotFoundError("Job description");

  if (resume.kind !== "resume") {
    throw new AppError("resumeId does not point to a resume", 422, "WRONG_KIND");
  }
  if (jobDescription.kind !== "job_description") {
    throw new AppError("jobDescriptionId does not point to a job description", 422, "WRONG_KIND");
  }

  const score = await scoreResume(resume.text, jobDescription.text);

  res.json({
    analysis: { ...score, resumeId, jobDescriptionId, createdAt: new Date().toISOString() },
  });
});