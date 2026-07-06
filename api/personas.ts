import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadBackend } from "./_backend";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { getPublicPersonas } = loadBackend<{
      getPublicPersonas: () => unknown[];
    }>("personas/config");

    res.status(200).json({ personas: getPublicPersonas() });
  } catch (error) {
    console.error("[personas] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to load personas", reason: message });
  }
}
