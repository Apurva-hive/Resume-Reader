# AI Resume & Interview Coach — Roadmap

An application that analyses a resume against a job description and helps the
user close the gap: ATS-style scoring, targeted rewrites, a tailored cover
letter, and interview practice.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Language | TypeScript (strict) | One language across client and server; shared types |
| Backend | Node + Express 5 | Native async error handling; large ecosystem |
| Frontend | React + Vite | Fast dev server; current default for non-Next React |
| Database | Postgres + pgvector | One database for relational data *and* embeddings |
| ORM | Drizzle | SQL-shaped, good TS inference, migrations included |
| Validation | Zod | Request bodies, env vars, and LLM output all validated |
| Logging | Pino | Structured JSON; used for per-call LLM usage tracking |
| Auth | Clerk / Better Auth | Not hand-rolled |

### Decisions worth remembering

- **Single backend.** No Python service. PDF extraction is weaker in Node than
  in Python; if it becomes a swamp, reach for a parsing API rather than adding
  a second runtime.
- **pgvector, not a dedicated vector DB.** Avoids two datastores drifting out
  of sync when a document is deleted.
- **SSE, not WebSockets.** Token streaming is one-directional.
- **Express over Fastify.** Preference, not requirement. Ecosystem size won.
- **Vite over Next.js.** Keeps the client/server boundary explicit so the
  backend work is visible rather than abstracted away.

## Milestones

### M0 — Skeleton ✅
Server boots, client reaches `/health`, deployed once while trivially small.

Deploying on day one means every later deploy is a small delta rather than a
mystery.

### M1 — Documents in ← current
Upload PDF/DOCX → extract text → store in Postgres. No AI yet.

- `multer` for multipart uploads, size and mime-type limits enforced
- `unpdf` or `pdfjs-dist` for PDF, `mammoth` for DOCX
- Expect two-column resumes to extract as interleaved text — handle it, don't
  ignore it
- Test against genuinely ugly real-world resumes early

**Done when:** a messy real resume round-trips to readable text in the DB.

### M2 — First LLM call
Resume + job description in, structured JSON out: score, matched skills,
missing skills. Blocking and slow — that's fine.

- All prompts live in `src/prompts/`, never inline in a route handler
- LLM output validated with Zod; validation failure is a normal error path
- All LLM traffic goes through `src/services/llm/client.ts`
- Log prompt, model, tokens, latency, and cost on every call

**Done when:** a real resume/JD pair produces a score you'd defend.

### M3 — Streaming
Convert the resume-improvement endpoint to SSE. One endpoint only until it
works properly — including a client disconnecting mid-stream.

**Done when:** tokens render as they generate and an aborted request doesn't
leak a connection.

### M4 — Auth + dashboard
Users, saved analyses, history view. Deliberately after M2/M3 — there's no
point persisting results that aren't worth keeping yet.

### M5 — Embeddings + pgvector
Semantic skill matching: embed each JD requirement and each resume bullet,
compare by cosine similarity, surface real gaps.

This is **not** RAG — it's plain embedding similarity, and it's the most
interesting engineering in the project. It upgrades M2's scoring rather than
replacing it.

**Done when:** the app spots a skill match that shares no keywords.

### M6 — Fan out
Cover letter, interview questions, mock interview. These are the same feature
as M2/M3 with different prompt templates — new files in `src/prompts/`, thin
routes, existing plumbing.

Mock interview is the exception: it's multi-turn, so watch context growth.
Resending the full transcript each turn gets expensive fast.

### M7 — RAG
A corpus of role-specific interview questions and resume guidance, retrieved
against parsed job title and seniority, used to ground generation.

This is where RAG genuinely applies: a corpus too large for context that grows
over time. Retrieving chunks of a document small enough to paste whole (a
resume, a JD) would be pure overhead.

Last by design — the only milestone that can be cut if time runs out.

## Out of scope (for now)

- Multi-resume comparison / version diffing
- Recruiter or employer-side features
- Payments
- Mobile app

## Backend structure

```
src/
├── index.ts              # boot only
├── app.ts                # express app, middleware, routes (no listen)
├── env.ts                # env vars validated at startup
├── routes/               # validate → call one service → shape response
├── services/             # all real logic
│   ├── extraction/
│   ├── llm/
│   └── embeddings.ts
├── prompts/
├── db/
├── schemas/              # zod: requests + LLM output shapes
├── middleware/
└── lib/
```

Four rules that keep this from rotting:

1. `app.ts` never calls `listen` — integration tests need the app object.
2. Route handlers hold no logic. Over ~20 lines means something leaked in.
3. One file owns the LLM connection: retries, timeouts, usage logging.
4. `env.ts` validates at boot. A missing API key crashes on startup with a
   clear message, not twenty minutes later mid-request.
