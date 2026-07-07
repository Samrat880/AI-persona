import { waitUntil } from "@vercel/functions";
import { getServerClient } from "~/server/stream/serverClient";
import { processServerlessMessage } from "~/server/services/serverlessMessageProcessor";
import { webhookEventSchema } from "~/server/schemas/chat";

export const maxDuration = 60;

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

    let json: unknown;
    try {
      json = JSON.parse(rawBody) as unknown;
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const parsed = webhookEventSchema.safeParse(json);
    if (!parsed.success) {
      console.warn("[webhook] Invalid payload:", parsed.error.flatten());
      return new Response("Invalid payload", { status: 400 });
    }

    const event = parsed.data;

    if (event.type === "message.new" && event.channel_id && event.message?.text) {
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
