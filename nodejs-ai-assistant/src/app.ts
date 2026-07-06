import cors from "cors";
import express, { type Request, type Response } from "express";
import { createAgent } from "./agents/createAgent";
import { AgentPlatform, type AIAgent } from "./agents/types";
import {
  getPersona,
  getPublicPersonas,
  isValidPersonaId,
  type PersonaId,
} from "./personas/config";
import {
  getBotUserId,
  getChannelWithState,
  resolvePersonaId,
  updateChannelAgentState,
} from "./services/channelAgentState";
import {
  getServerlessAgentStatus,
  startServerlessAgent,
  stopServerlessAgent,
} from "./services/serverlessAgentLifecycle";
import { processServerlessMessage } from "./services/serverlessMessageProcessor";
import { getApiKey, getServerClient } from "./serverClient";
import { warmupYouTubeChannels } from "./services/youtubeSearch";

export const isServerless = Boolean(process.env.VERCEL);

/** Fire-and-forget on serverless; blocking warmup runs on local server start only. */
export function scheduleYouTubeWarmup() {
  if (!isServerless) return;
  void warmupYouTubeChannels().catch((error) => {
    console.warn("[YouTube] Background warmup failed:", error);
  });
}

const app = express();

const corsOrigin = process.env.FRONTEND_URL?.replace(/\/$/, "") || "*";
app.use(
  cors({
    origin: corsOrigin === "*" ? "*" : [corsOrigin, "http://localhost:8080"],
  })
);

const aiAgentCache = new Map<string, AIAgent>();
const pendingAiAgents = new Set<string>();

if (!isServerless) {
  const inactivityThreshold = 480 * 60 * 1000;
  setInterval(async () => {
    const now = Date.now();
    for (const [userId, aiAgent] of aiAgentCache) {
      if (now - aiAgent.getLastInteraction() > inactivityThreshold) {
        console.log(`Disposing AI Agent due to inactivity: ${userId}`);
        await disposeAiAgent(aiAgent);
        aiAgentCache.delete(userId);
      }
    }
  }, 5000);
}

async function disposeAiAgent(aiAgent: AIAgent) {
  await aiAgent.dispose();
  if (!aiAgent.user) {
    return;
  }
  await getServerClient().deleteUser(aiAgent.user.id, {
    hard_delete: true,
  });
}

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      const signature = req.headers["x-signature"] as string | undefined;
      const rawBody =
        typeof req.body === "string"
          ? req.body
          : Buffer.isBuffer(req.body)
            ? req.body.toString("utf8")
            : JSON.stringify(req.body);

      if (signature && !getServerClient().verifyWebhook(rawBody, signature)) {
        res.status(401).send("Invalid webhook signature");
        return;
      }

      const event = JSON.parse(rawBody) as {
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

      res.status(200).send("OK");

      if (event.type === "message.new" && event.channel_id && event.message) {
        void processServerlessMessage(
          event.channel_type ?? "messaging",
          event.channel_id,
          event.message
        ).catch((error) => {
          console.error("[Webhook] Message processing failed:", error);
        });
      }
    } catch (error) {
      console.error("[Webhook] Error:", error);
      res.status(500).send("Webhook handler error");
    }
  }
);

app.use(express.json());

const api = express.Router();

api.get("/", (_req, res) => {
  res.json({
    message: "Persona Chat Assistant Server is running",
    mode: isServerless ? "serverless" : "persistent",
    activeAgents: isServerless ? "n/a" : aiAgentCache.size,
  });
});

api.get("/public-config", (_req, res) => {
  try {
    res.json({ streamApiKey: getApiKey() });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Server configuration error";
    console.error("[API] /public-config failed:", message);
    res.status(500).json({
      error: "Server not configured",
      hint: "Set STREAM_API_KEY and STREAM_API_SECRET in Vercel environment variables",
    });
  }
});

api.get("/personas", (_req, res) => {
  res.json({ personas: getPublicPersonas() });
});

api.post("/start-ai-agent", async (req, res) => {
  const { channel_id, channel_type = "messaging", persona_id } = req.body;
  console.log(`[API] /start-ai-agent called for channel: ${channel_id}`);

  if (!channel_id) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const personaId = resolvePersonaId(persona_id);

  try {
    if (isServerless) {
      await startServerlessAgent(channel_type, channel_id, personaId);
      res.json({
        message: "AI Agent started (serverless)",
        persona_id: personaId,
        data: [],
      });
      return;
    }

    const user_id = getBotUserId(channel_id);
    const existingAgent = aiAgentCache.get(user_id);
    if (existingAgent) {
      await existingAgent.setPersona(personaId);
      res.json({ message: "AI Agent started", persona_id: personaId, data: [] });
      return;
    }

    if (!pendingAiAgents.has(user_id)) {
      pendingAiAgents.add(user_id);
      const personaConfig = getPersona(personaId);

      await getServerClient().upsertUser({
        id: user_id,
        name: personaConfig.botDisplayName,
        image: personaConfig.avatarUrl,
      });

      const channel = getServerClient().channel(channel_type, channel_id);
      await channel.addMembers([user_id]);

      const agent = await createAgent(
        user_id,
        AgentPlatform.OPENAI,
        channel_type,
        channel_id,
        personaId
      );

      await agent.init();
      if (aiAgentCache.has(user_id)) {
        await agent.dispose();
      } else {
        aiAgentCache.set(user_id, agent);
      }
    }

    res.json({ message: "AI Agent started", persona_id: personaId, data: [] });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to start AI Agent", errorMessage);
    res
      .status(500)
      .json({ error: "Failed to start AI Agent", reason: errorMessage });
  } finally {
    if (!isServerless) {
      pendingAiAgents.delete(getBotUserId(channel_id));
    }
  }
});

api.post("/stop-ai-agent", async (req, res) => {
  const { channel_id, channel_type = "messaging" } = req.body;
  console.log(`[API] /stop-ai-agent called for channel: ${channel_id}`);

  if (!channel_id) {
    res.status(400).json({ error: "Missing channel_id" });
    return;
  }

  try {
    if (isServerless) {
      await stopServerlessAgent(channel_type, channel_id);
      res.json({ message: "AI Agent stopped", data: [] });
      return;
    }

    const user_id = getBotUserId(channel_id);
    const aiAgent = aiAgentCache.get(user_id);
    if (aiAgent) {
      await disposeAiAgent(aiAgent);
      aiAgentCache.delete(user_id);
    }
    res.json({ message: "AI Agent stopped", data: [] });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to stop AI Agent", errorMessage);
    res
      .status(500)
      .json({ error: "Failed to stop AI Agent", reason: errorMessage });
  }
});

api.post("/set-persona", async (req, res) => {
  const { channel_id, channel_type = "messaging", persona_id } = req.body;

  if (!channel_id || !persona_id) {
    res.status(400).json({ error: "Missing channel_id or persona_id" });
    return;
  }

  if (!isValidPersonaId(persona_id)) {
    res.status(400).json({ error: "Invalid persona_id" });
    return;
  }

  if (isServerless) {
    await updateChannelAgentState(channel_type, channel_id, {
      ai_persona_id: persona_id,
    });
    const { state } = await getChannelWithState(channel_type, channel_id);
    if (state.ai_bot_user_id) {
      const persona = getPersona(persona_id);
      await getServerClient().upsertUser({
        id: state.ai_bot_user_id,
        name: persona.botDisplayName,
        image: persona.avatarUrl,
      });
    }
    res.json({ message: "Persona updated", persona_id });
    return;
  }

  const user_id = getBotUserId(channel_id);
  const aiAgent = aiAgentCache.get(user_id);

  if (!aiAgent) {
    res.json({
      message: "Persona saved; agent not connected",
      persona_id,
    });
    return;
  }

  try {
    await aiAgent.setPersona(persona_id);
    res.json({ message: "Persona updated", persona_id });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to set persona", errorMessage);
    res.status(500).json({ error: "Failed to set persona", reason: errorMessage });
  }
});

api.get("/agent-status", async (req, res) => {
  const { channel_id, channel_type = "messaging" } = req.query;

  if (!channel_id || typeof channel_id !== "string") {
    res.status(400).json({ error: "Missing channel_id" });
    return;
  }

  if (isServerless) {
    const result = await getServerlessAgentStatus(
      typeof channel_type === "string" ? channel_type : "messaging",
      channel_id
    );
    res.json(result);
    return;
  }

  const user_id = getBotUserId(channel_id);
  const agent = aiAgentCache.get(user_id);
  if (agent) {
    res.json({ status: "connected", persona_id: agent.activePersonaId });
  } else if (pendingAiAgents.has(user_id)) {
    res.json({ status: "connecting", persona_id: resolvePersonaId() });
  } else {
    res.json({ status: "disconnected", persona_id: resolvePersonaId() });
  }
});

api.post("/token", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiration = issuedAt + 60 * 60;
    const token = getServerClient().createToken(userId, expiration, issuedAt);

    res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

app.use("/api", api);

app.get("/", (_req, res) => {
  res.json({ message: "Persona Chat Assistant API", docs: "/api" });
});

export default app;
