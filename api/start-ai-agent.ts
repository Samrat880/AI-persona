import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadBackend } from "./_backend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body =
    typeof req.body === "object" && req.body !== null
      ? (req.body as {
          channel_id?: string;
          channel_type?: string;
          persona_id?: string;
        })
      : {};

  const { channel_id, channel_type = "messaging", persona_id } = body;

  if (!channel_id) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const lifecycle = loadBackend<{
      resolvePersonaIdFromInput: (id?: string) => string;
      startServerlessAgent: (
        channelType: string,
        channelId: string,
        personaId: string
      ) => Promise<unknown>;
    }>("services/serverlessAgentLifecycle");

    const personaId = lifecycle.resolvePersonaIdFromInput(persona_id);
    await lifecycle.startServerlessAgent(channel_type, channel_id, personaId);

    res.status(200).json({
      message: "AI Agent started (serverless)",
      persona_id: personaId,
      data: [],
    });
  } catch (error) {
    console.error("[start-ai-agent] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to start AI Agent", reason: message });
  }
}

export const config = {
  maxDuration: 60,
};
