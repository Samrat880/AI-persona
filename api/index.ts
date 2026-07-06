import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Lightweight health check — do not load Express (avoids 504 on GET/POST /api). */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: "Persona Chat Assistant Server is running",
    mode: "serverless",
    routes: [
      "/api/webhook",
      "/api/start-ai-agent",
      "/api/token",
      "/api/public-config",
    ],
  });
}

export const config = {
  maxDuration: 10,
};
