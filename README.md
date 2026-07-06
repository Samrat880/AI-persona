# Guru Chat App

Monorepo: `nodejs-ai-assistant` (Express backend) + `react-stream-ai-assistant` (Vite frontend).

## Prerequisites

- Node.js 20+
- npm (workspaces; `.npmrc` uses `legacy-peer-deps=true`)

## Setup

From the **repository root** (not a workspace subfolder):

```bash
npm install
cp nodejs-ai-assistant/.env.example nodejs-ai-assistant/.env
cp react-stream-ai-assistant/.env.example react-stream-ai-assistant/.env
```

Fill in `nodejs-ai-assistant/.env` (Stream, OpenAI, etc.). Set `FRONTEND_URL` to your frontend origin (`http://localhost:8080` locally, your Vercel URL in production).

## Local development

Run both from the repo root:

```bash
npm run dev:backend   # http://localhost:3000
npm run dev:frontend  # http://localhost:8080
```

`react-stream-ai-assistant/.env` should have `VITE_BACKEND_URL=http://localhost:3000`.

## Build

```bash
npm run build
```

## Deploy (Vercel)

Deploy from the repo root. `vercel.json` builds both workspaces and serves the SPA from `react-stream-ai-assistant/dist`. Configure Stream webhook URL to `https://<your-domain>/api/webhook`.
