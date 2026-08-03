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


## Milestones

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