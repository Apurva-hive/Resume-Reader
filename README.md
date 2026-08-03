# AI Resume & Interview Coach

Analyses a resume against a job description: ATS-style scoring, targeted
rewrites, tailored cover letters, and interview practice.

See [ROADMAP.md](./ROADMAP.md) for the build plan and stack decisions.

## Stack

TypeScript throughout. Node + Express 5 on the server, React + Vite on the
client, Postgres + pgvector for storage and embeddings.

## Getting started

Requires Node 20+.

```bash
# server
cd server
cp .env.example .env
npm install
npm run dev          # http://localhost:3000

# client (separate terminal)
cd client
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

Open http://localhost:5173 — it should report "connected".

## Scripts

Both packages expose the same set:

| Command | Does |
|---|---|
| `npm run dev` | Watch mode |
| `npm run build` | Production build |
| `npm run typecheck` | Types only, no output |
| `npm start` | Run the built server (server only) |

## Layout

```
server/src/
├── index.ts        boot: listen, signal handling
├── app.ts          express app + middleware (never calls listen)
├── env.ts          env vars validated at startup
├── routes/         thin: validate → call a service → shape response
├── services/       all real logic
├── prompts/        LLM prompt templates, one per task
├── schemas/        zod: request bodies and LLM output shapes
├── db/             connection, schema, migrations
├── middleware/
└── lib/            logger, error types

client/src/
├── App.tsx
├── main.tsx
└── lib/api.ts      single place that talks to the backend
```
