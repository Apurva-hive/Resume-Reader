import { Router } from "express";
import { AppError, NotFoundError } from "../lib/errors.js";
import { analysisStore, analyzeRequestSchema } from "../schemas/analysis.js";
import { documentStore } from "../schemas/document.js";
import { scoreResume } from "../services/analysis.js";
import { openSse } from "../lib/sse.js";
import { streamComplete } from "../services/llm/stream.js";
import { env } from "../env.js";
import { logger } from "../lib/logger.js";
import { improveResumeSystem, improveResumeUser } from "../prompts/improveResume.js";
import { client } from "../services/llm/client.js";

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

analysisRouter.post("/improve", async (req, res) => {
  const { resumeId, jobDescriptionId } = analyzeRequestSchema.parse(req.body);

  const resume = await documentStore.get(resumeId);
  if (!resume) throw new NotFoundError("Resume");
  const jd = await documentStore.get(jobDescriptionId);
  if (!jd) throw new NotFoundError("Job description");

  const sse = openSse(req, res);
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  let full = "";

  try {
    for await (const event of streamComplete(client, env.LLM_MODEL, {
      task: "improve_resume",
      system: improveResumeSystem,
      user: improveResumeUser(resume.text, jd.text),
      signal: controller.signal,
    })) {
      if (sse.aborted) break;

    if (event.type === "delta") {
      logger.debug({ aborted: sse.aborted, len: event.text.length }, "delta");
      full += event.text;
      sse.send("delta", { text: event.text });
    }else {
        logger.info({ task: "improve_resume", ...event }, "llm stream complete");
        sse.send("done", { length: full.length });
      }
    }
  } catch (err) {
    logger.error({ err }, "stream failed");
    if (!sse.aborted) sse.send("error", { message: "Generation failed partway through." });
  } finally {
    sse.close();
  }
});