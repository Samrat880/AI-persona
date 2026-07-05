import cors from "cors";
import "dotenv/config";
import express from "express";
import { createAgent } from "./agents/createAgent";
import { AgentPlatform, AIAgent } from "./agents/types";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  getPublicPersonas,
  isValidPersonaId,
  type PersonaId,
} from "./personas/config";
import { apiKey, serverClient } from "./serverClient";
import { warmupYouTubeChannels } from "./services/youtubeSearch";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

const aiAgentCache = new Map<string, AIAgent>();
const pendingAiAgents = new Set<string>();

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

function getBotUserId(channelId: string) {
  return `ai-bot-${channelId.replace(/[!]/g, "")}`;
}

function resolvePersonaId(persona_id?: string): PersonaId {
  if (persona_id && isValidPersonaId(persona_id)) {
    return persona_id;
  }
  return DEFAULT_PERSONA_ID;
}

app.get("/", (req, res) => {
  res.json({
    message: "Persona Chat Assistant Server is running",
    apiKey: apiKey,
    activeAgents: aiAgentCache.size,
  });
});

app.get("/personas", (req, res) => {
  res.json({ personas: getPublicPersonas() });
});

app.post("/start-ai-agent", async (req, res) => {
  const { channel_id, channel_type = "messaging", persona_id } = req.body;
  console.log(`[API] /start-ai-agent called for channel: ${channel_id}`);

  if (!channel_id) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const personaId = resolvePersonaId(persona_id);
  const user_id = getBotUserId(channel_id);

  try {
    const existingAgent = aiAgentCache.get(user_id);
    if (existingAgent) {
      await existingAgent.setPersona(personaId);
      console.log(`[API] Updated persona for existing agent ${user_id}`);
      res.json({ message: "AI Agent started", persona_id: personaId, data: [] });
      return;
    }

    if (!pendingAiAgents.has(user_id)) {
      console.log(`[API] Creating new agent for ${user_id}`);
      pendingAiAgents.add(user_id);

      const personaConfig = getPersona(personaId);

      await serverClient.upsertUser({
        id: user_id,
        name: personaConfig.botDisplayName,
        image: personaConfig.avatarUrl,
      });

      const channel = serverClient.channel(channel_type, channel_id);
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
    } else {
      console.log(`AI Agent ${user_id} already started or is pending.`);
    }

    res.json({ message: "AI Agent started", persona_id: personaId, data: [] });
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error("Failed to start AI Agent", errorMessage);
    res
      .status(500)
      .json({ error: "Failed to start AI Agent", reason: errorMessage });
  } finally {
    pendingAiAgents.delete(user_id);
  }
});

app.post("/stop-ai-agent", async (req, res) => {
  const { channel_id } = req.body;
  console.log(`[API] /stop-ai-agent called for channel: ${channel_id}`);
  const user_id = getBotUserId(channel_id);
  try {
    const aiAgent = aiAgentCache.get(user_id);
    if (aiAgent) {
      console.log(`[API] Disposing agent for ${user_id}`);
      await disposeAiAgent(aiAgent);
      aiAgentCache.delete(user_id);
    } else {
      console.log(`[API] Agent for ${user_id} not found in cache.`);
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

app.post("/set-persona", async (req, res) => {
  const { channel_id, persona_id } = req.body;

  if (!channel_id || !persona_id) {
    res.status(400).json({ error: "Missing channel_id or persona_id" });
    return;
  }

  if (!isValidPersonaId(persona_id)) {
    res.status(400).json({ error: "Invalid persona_id" });
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

app.get("/agent-status", (req, res) => {
  const { channel_id } = req.query;
  if (!channel_id || typeof channel_id !== "string") {
    return res.status(400).json({ error: "Missing channel_id" });
  }
  const user_id = getBotUserId(channel_id);
  console.log(
    `[API] /agent-status called for channel: ${channel_id} (user: ${user_id})`
  );

  const agent = aiAgentCache.get(user_id);
  if (agent) {
    console.log(`[API] Status for ${user_id}: connected`);
    res.json({ status: "connected", persona_id: agent.activePersonaId });
  } else if (pendingAiAgents.has(user_id)) {
    console.log(`[API] Status for ${user_id}: connecting`);
    res.json({ status: "connecting", persona_id: DEFAULT_PERSONA_ID });
  } else {
    console.log(`[API] Status for ${user_id}: disconnected`);
    res.json({ status: "disconnected", persona_id: DEFAULT_PERSONA_ID });
  }
});

app.post("/token", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: "userId is required",
      });
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiration = issuedAt + 60 * 60;

    const token = serverClient.createToken(userId, expiration, issuedAt);

    res.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res.status(500).json({
      error: "Failed to generate token",
    });
  }
});

async function disposeAiAgent(aiAgent: AIAgent) {
  await aiAgent.dispose();
  if (!aiAgent.user) {
    return;
  }
  await serverClient.deleteUser(aiAgent.user.id, {
    hard_delete: true,
  });
}

const port = process.env.PORT || 3000;
app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  await warmupYouTubeChannels();
});
