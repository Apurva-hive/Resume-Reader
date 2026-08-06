import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { atsScoreSystem, atsScoreUser } from "../prompts/atsScore.js";
import { atsScoreSchema, type AtsScore } from "../schemas/analysis.js";
import { complete } from "./llm/client.js";

function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new AppError("The AI returned an unreadable response. Try again.", 502, "LLM_BAD_JSON");
  }

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    throw new AppError("The AI returned malformed JSON. Try again.", 502, "LLM_BAD_JSON");
  }
}

export async function scoreResume(
  resumeText: string,
  jobDescriptionText: string
): Promise<AtsScore> {
  const result = await complete({
    task: "ats_score",
    system: atsScoreSystem,
    user: atsScoreUser(resumeText, jobDescriptionText),
    maxTokens: 2500,
  });

  const parsed = atsScoreSchema.safeParse(extractJson(result.text));

  if (parsed.success) return parsed.data;

  logger.warn(
    { errors: parsed.error.flatten() },
    "llm output failed validation, attempting repair"
  );

  const repair = await complete({
    task: "ats_score_repair",
    system: atsScoreSystem,
    user: `Your previous response did not match the required schema.

<your_response>
${result.text}
</your_response>

<validation_errors>
${JSON.stringify(parsed.error.flatten(), null, 2)}
</validation_errors>

Return the corrected JSON object only.`,
    maxTokens: 2500,
  });

  const repaired = atsScoreSchema.safeParse(extractJson(repair.text));

  if (!repaired.success) {
    logger.error({ errors: repaired.error.flatten() }, "llm output failed validation after repair");
    throw new AppError("The AI could not produce a valid analysis. Try again.", 502, "LLM_INVALID_OUTPUT");
  }

  return repaired.data;
}