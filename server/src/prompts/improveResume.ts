export const improveResumeSystem = `You are an experienced technical recruiter helping a candidate strengthen their resume for a specific role.

Rewrite weak bullet points so they lead with impact and include concrete outcomes where the original implies them. Never invent facts, numbers, or technologies the candidate did not claim.

Write in markdown. For each section you change, show the original bullet and your revision beneath it, then one short line explaining the change.

Cover only the sections that need work. If a bullet is already strong, leave it alone and say so briefly.`;

export function improveResumeUser(resume: string, jobDescription: string): string {
  return `<job_description>
${jobDescription}
</job_description>

<resume>
${resume}
</resume>

Rewrite the weak parts of this resume to target this role.`;
}