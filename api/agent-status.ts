import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadBackend } from "./_backend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const channel_id = req.query.channel_id;
  const channel_type =
    typeof req.query.channel_type === "string"
      ? req.query.channel_type
      : "messaging";

  if (!channel_id || typeof channel_id !== "string") {
    res.status(400).json({ error: "Missing channel_id" });
    return;
  }

  try {
    const { getServerlessAgentStatus } = loadBackend<{
      getServerlessAgentStatus: (
        channelType: string,
        channelId: string
      ) => Promise<{ status: string; persona_id: string }>;
    }>("services/serverlessAgentLifecycle");

    const result = await getServerlessAgentStatus(channel_type, channel_id);
    res.status(200).json(result);
  } catch (error) {
    console.error("[agent-status] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to get agent status", reason: message });
  }
}
