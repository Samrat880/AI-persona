import type { VercelRequest, VercelResponse } from "@vercel/node";
import { StreamChat } from "stream-chat";

/** Fast path for Stream user tokens — avoids loading the full Express app. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiKey || !apiSecret) {
    res.status(500).json({
      error: "Server not configured",
      hint: "Set STREAM_API_KEY and STREAM_API_SECRET in Vercel environment variables",
    });
    return;
  }

  const userId =
    typeof req.body === "object" && req.body !== null
      ? (req.body as { userId?: string }).userId
      : undefined;

  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  try {
    const client = StreamChat.getInstance(apiKey, apiSecret);
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiration = issuedAt + 60 * 60;
    const token = client.createToken(userId, expiration, issuedAt);
    res.status(200).json({ token });
  } catch (error) {
    console.error("[token] Error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
}
