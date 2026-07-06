import { waitUntil } from "@vercel/functions";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadBackend } from "./_backend";

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60,
};

async function readRawBody(req: VercelRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

type WebhookEvent = {
  type?: string;
  channel_id?: string;
  channel_type?: string;
  message?: {
    id?: string;
    text?: string;
    ai_generated?: boolean;
    user?: { id?: string };
    custom?: Record<string, unknown>;
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "GET" || req.method === "HEAD") {
    res.status(200).send("OK");
    return;
  }

  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const signature = req.headers["x-signature"] as string | undefined;

    const { getServerClient } = loadBackend<{
      getServerClient: () => { verifyWebhook: (body: string, sig: string) => boolean };
    }>("serverClient");

    if (signature && !getServerClient().verifyWebhook(rawBody, signature)) {
      res.status(401).send("Invalid webhook signature");
      return;
    }

    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody) as WebhookEvent;
    } catch {
      res.status(400).send("Invalid JSON");
      return;
    }

    // ACK Stream immediately — AI work runs in waitUntil after the response.
    res.status(200).send("OK");

    if (event.type === "message.new" && event.channel_id && event.message) {
      const channelType = event.channel_type ?? "messaging";
      const channelId = event.channel_id;
      const message = event.message;

      waitUntil(
        (async () => {
          const { processServerlessMessage } = loadBackend<{
            processServerlessMessage: (
              channelType: string,
              channelId: string,
              message: NonNullable<WebhookEvent["message"]>
            ) => Promise<void>;
          }>("services/serverlessMessageProcessor");

          await processServerlessMessage(channelType, channelId, message);
        })().catch((error) => {
          console.error("[webhook] Message processing failed:", error);
        })
      );
    }
  } catch (error) {
    console.error("[webhook] Error:", error);
    if (!res.headersSent) {
      res.status(500).send("Webhook handler error");
    }
  }
}
