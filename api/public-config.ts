import type { VercelRequest, VercelResponse } from "@vercel/node";

/** Fast path — does not load the full Express app (avoids cold-start 504). */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const streamApiKey = process.env.STREAM_API_KEY;
  if (!streamApiKey) {
    res.status(500).json({
      error: "Server not configured",
      hint: "Set STREAM_API_KEY in Vercel environment variables",
    });
    return;
  }

  res.status(200).json({ streamApiKey });
}
