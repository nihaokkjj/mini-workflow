# Render + Vercel Deployment

This repo is a pnpm workspace with a Vite frontend and a NestJS backend.

## 1. Rotate Secrets

Do not deploy the existing local `backend/.env` file. If the key in that file has ever been shared or committed, revoke it and create a new provider key.

## 2. Deploy Backend To Render

Create a Render Web Service from this repository.

You can either use the checked-in `render.yaml` Blueprint or configure the service manually.

Recommended settings:

- Root Directory: leave empty
- Runtime: Node
- Build Command: `node -v && corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm -v && pnpm install --frozen-lockfile && pnpm build:shared && pnpm build:backend`
- Start Command: `pnpm --filter @mini-dify/backend start`

Environment variables:

- `NODE_VERSION=24.15.0`
- `NODE_ENV=production`
- `OPENAI_API_KEY=<your provider key>`
- `OPENAI_BASE_URL=<your OpenAI-compatible base URL>`
- `FRONTEND_ORIGIN=https://<your-vercel-app>.vercel.app`

Render injects `PORT` automatically, so you normally do not need to set it.

## 3. Deploy Frontend To Vercel

Create a Vercel project from the same repository.

The checked-in `vercel.json` configures the root workspace build. If you configure Vercel manually, use the settings below.

Recommended settings:

- Root Directory: leave empty
- Install Command: `corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --frozen-lockfile`
- Build Command: `pnpm build:shared && pnpm build:frontend`
- Output Directory: `frontend/dist`

Environment variables:

- `VITE_API_BASE_URL=https://<your-render-service>.onrender.com/api`

## 4. SQLite Limitation

The backend currently writes production data to `prod.db`. This is fine for a demo, but Render's free web service filesystem is not durable across restarts and deploys. For persistent production data, migrate TypeORM from SQLite to a hosted Postgres database such as Neon.

## Troubleshooting

If Render reports a native build error for `better-sqlite3` or `isolated-vm`, trigger **Manual Deploy > Clear build cache & deploy** after these settings are in place. The deployment pins Node 24.15.0 and pnpm 9.15.4 so both native bindings build against the same V8 version. The first two build log lines should show Node `v24.x` and pnpm `9.15.4`.
