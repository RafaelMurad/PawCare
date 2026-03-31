# PawCare Hub

AI-powered dog care companion. Express backend with React frontend, SQLite database, dual AI provider support.

## Stack

Backend: Express 4, TypeScript, better-sqlite3 (raw SQL, no ORM), JWT auth.
Frontend: React 18, Vite 5, Tailwind CSS 3, react-router-dom 6. Separate package in `frontend/`.
AI: OpenAI + Anthropic with automatic fallback.
`npm` for packages — run `npm run install:all` for both root and frontend.

## Development

```bash
npm run dev             # backend (tsx watch, port 3001)
npm run frontend:dev    # frontend (vite, proxied to backend)
npm run build           # tsc + frontend build
npm run db:init         # create tables + seed food data
```

No tests. No linter configured.

## Conventions

- Two separate `npm install`s — root (backend) and `frontend/`. Use `npm run install:all`.
- Database auto-creates tables on first run (`CREATE TABLE IF NOT EXISTS` in `src/db/init.ts`).
- All DB access is synchronous `better-sqlite3` prepared statements — no async.
- AI service in `src/services/ai.ts` — singleton, provider selected via `DEFAULT_AI_PROVIDER` env var.
- Express routes under `/api/` — all except `/api/auth` and `/api/health-check` require JWT Bearer token.
- In production, backend serves `frontend/dist/` with SPA fallback.
