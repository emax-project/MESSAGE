# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

EMAX Message — Electron + Node.js 기반 회사용 메신저 앱 (npm workspaces monorepo).

| Package | Description | Port |
|---------|------------|------|
| `packages/server` | Express API + Socket.IO (Node.js, plain JS ESM) | 3001 |
| `packages/client` | React + Vite + Electron desktop app | 5173 (dev) |

PostgreSQL 16 runs via Docker on host port **5433**.

### Starting services

1. **PostgreSQL**: `docker compose up -d db` (requires Docker; container exposes `localhost:5433`)
2. **Server .env**: `cp packages/server/.env.example packages/server/.env` (only needed once; uses `DATABASE_URL=postgresql://message:message@localhost:5433/message`)
3. **DB schema**: `npm run db:push --workspace=server`
4. **Seed test data**: `npm run db:seed --workspace=server` — creates `test1@test.com` / `123456` and `test2@test.com` / `123456`
5. **API server**: `npm run dev:server` (runs `node --watch` on port 3001)
6. **Client (web)**: `npm run dev:client` (Vite dev server on port 5173 with proxy to API)
7. **Client (Electron)**: `npm run dev:app` (Vite + Electron; not usable in headless environments)

For headless/cloud environments, use `npm run dev:client` (web only) instead of `npm run dev:app` (Electron). The Vite config proxies all API routes to `localhost:3001`.

### Lint / Test / Build commands

See `package.json` root scripts:

- **Lint**: `npm run lint` (runs ESLint for both client and server)
- **Typecheck**: `npm run typecheck`
- **Test**: `npm run test` (client: vitest, server: node --test)
- **Build client**: `npm run build:client`

### Non-obvious caveats

- The server uses ES modules (`"type": "module"`) but ESLint is not configured with `sourceType: "module"`, so `npm run lint --workspace=server` reports parsing errors on all files. This is a pre-existing issue.
- The client ESLint has pre-existing errors (unused vars, conditional hooks). Lint exit code 1 is expected.
- No test files exist yet in either package; test commands exit cleanly (server) or with code 1 (client, "no test files found").
- `postinstall` in root `package.json` runs `prisma generate` automatically on `npm install`.
- Docker must be running before starting the API server, otherwise Prisma cannot connect to the DB.
- Ollama (AI chat) is optional; core messaging works without it.
