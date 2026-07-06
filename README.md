# Guru Chat

AI mentor chat app (Hitesh & Piyush) — **Next.js + tRPC + GetStream + OpenAI**.

All API keys stay on the server. This repository **is** the app (no subfolder).

## Quick start

```bash
npm install
cp .env.example .env   # add Stream + OpenAI keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> Uses `.npmrc` with `legacy-peer-deps=true` for Stream Chat peer deps.

If you still have a leftover `guru-chat/` folder from an older layout, stop the dev server and delete it — the app lives at the repo root.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STREAM_API_KEY` | Yes | GetStream public API key |
| `STREAM_API_SECRET` | Yes | GetStream secret (server only) |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `TAVILY_API_KEY` | No | Web search for AI |
| `YOUTUBE_API_KEY` | No | Guru YouTube video search |
| `FRONTEND_URL` | No | Public URL for bot avatars |

## Deploy on Vercel

1. Import this repo (root directory — **do not** set a subdirectory).
2. Add env vars from `.env.example`.
3. Deploy and note your production URL.
4. Set `FRONTEND_URL` to that URL for bot avatar URLs in production.
5. Stream dashboard → Webhook: `https://YOUR-URL/api/webhook` with event `message.new`.

**Local dev:** AI replies work without a webhook tunnel via `agent.processMessage` (dev only). Production requires the Stream webhook.

## Project layout

```
src/app/           pages + API (tRPC + webhook)
src/components/    chat UI
src/server/        AI logic + tRPC (secrets here)
src/hooks/         client hooks
public/personas/   Hitesh.png, Piyush.png
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build locally |
