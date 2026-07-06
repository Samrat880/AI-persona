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

  if (!channel_id || !persona_id) {
    res.status(400).json({ error: "Missing channel_id or persona_id" });
    return;
  }

  try {
    const personas = loadBackend<{
      isValidPersonaId: (id: string) => boolean;
    }>("personas/config");

    if (!personas.isValidPersonaId(persona_id)) {
      res.status(400).json({ error: "Invalid persona_id" });
      return;
    }

    const { setServerlessPersona } = loadBackend<{
      setServerlessPersona: (
        channelType: string,
        channelId: string,
        personaId: string
      ) => Promise<void>;
    }>("services/serverlessAgentLifecycle");

    await setServerlessPersona(channel_type, channel_id, persona_id);
    res.status(200).json({ message: "Persona updated", persona_id });
  } catch (error) {
    console.error("[set-persona] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to set persona", reason: message });
  }
}
