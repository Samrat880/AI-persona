import { StreamChat } from "stream-chat";
import { apiKey, serverClient } from "../serverClient";
import {
  DEFAULT_PERSONA_ID,
  type PersonaId,
} from "../personas/config";
import { OpenAIAgent } from "./openai/OpenAIAgent";
import { AgentPlatform, AIAgent } from "./types";

export const createAgent = async (
  user_id: string,
  platform: AgentPlatform,
  channel_type: string,
  channel_id: string,
  personaId: PersonaId = DEFAULT_PERSONA_ID
): Promise<AIAgent> => {
  const token = serverClient.createToken(user_id);
  const chatClient = new StreamChat(apiKey, undefined, {
    allowServerSideConnect: true,
  });

  await chatClient.connectUser({ id: user_id }, token);
  const channel = chatClient.channel(channel_type, channel_id);
  await channel.watch();

  switch (platform) {
    case AgentPlatform.WRITING_ASSISTANT:
    case AgentPlatform.OPENAI:
      return new OpenAIAgent(chatClient, channel, personaId);
    default:
      throw new Error(`Unsupported agent platform: ${platform}`);
  }
};
