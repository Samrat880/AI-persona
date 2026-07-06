import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadBackend } from "./_backend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body =
    typeof req.body === "object" && req.body !== null
      ? (req.body as { channel_id?: string; channel_type?: string })
      : {};

  const { channel_id, channel_type = "messaging" } = body;

  if (!channel_id) {
    res.status(400).json({ error: "Missing channel_id" });
    return;
  }

  try {
    const { stopServerlessAgent } = loadBackend<{
      stopServerlessAgent: (channelType: string, channelId: string) => Promise<void>;
    }>("services/serverlessAgentLifecycle");

    await stopServerlessAgent(channel_type, channel_id);
    res.status(200).json({ message: "AI Agent stopped", data: [] });
  } catch (error) {
    console.error("[stop-ai-agent] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to stop AI Agent", reason: message });
  }
}
