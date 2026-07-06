import { waitUntil } from "@vercel/functions";
import { getServerClient } from "~/server/stream/serverClient";
import { processServerlessMessage } from "~/server/services/serverlessMessageProcessor";

export const maxDuration = 60;

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

export async function GET() {
  return new Response("OK", { status: 200 });
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-signature") ?? undefined;

    if (signature && !getServerClient().verifyWebhook(rawBody, signature)) {
      return new Response("Invalid webhook signature", { status: 401 });
    }

    let event: WebhookEvent;
    try {
      event = JSON.parse(rawBody) as WebhookEvent;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    if (event.type === "message.new" && event.channel_id && event.message) {
      const channelType = event.channel_type ?? "messaging";
      const channelId = event.channel_id;
      const message = event.message;

      const processing = processServerlessMessage(
        channelType,
        channelId,
        message
      ).catch((error) => {
        console.error("[webhook] Message processing failed:", error);
      });

      if (process.env.VERCEL === "1") {
        waitUntil(processing);
      } else {
        void processing;
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("[webhook] Error:", error);
    return new Response("Webhook handler error", { status: 500 });
  }
}
