import { createOpenAIClient, createPersonaAssistant } from "../lib/openaiSetup";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  isValidPersonaId,
  type PersonaId,
} from "../personas/config";
import { getServerClient } from "../serverClient";
import {
  getBotUserId,
  getChannelWithState,
  readPersonaFromState,
  updateChannelAgentState,
  type ChannelAgentState,
} from "./channelAgentState";

export async function startServerlessAgent(
  channelType: string,
  channelId: string,
  personaId: PersonaId
): Promise<ChannelAgentState> {
  const user_id = getBotUserId(channelId);
  const persona = getPersona(personaId);
  const openai = createOpenAIClient();

  await getServerClient().upsertUser({
    id: user_id,
    name: persona.botDisplayName,
    image: persona.avatarUrl,
  });

  const channel = getServerClient().channel(channelType, channelId);
  await channel.addMembers([user_id]);

  const assistant = await createPersonaAssistant(openai);
  const thread = await openai.beta.threads.create();

  const state: ChannelAgentState = {
    ai_agent_enabled: true,
    ai_persona_id: personaId,
    openai_thread_id: thread.id,
    openai_assistant_id: assistant.id,
    ai_bot_user_id: user_id,
  };

  await channel.updatePartial({ set: state });
  return state;
}

export async function stopServerlessAgent(
  channelType: string,
  channelId: string
) {
  const { channel, state } = await getChannelWithState(channelType, channelId);

  await channel.updatePartial({
    set: { ai_agent_enabled: false },
  });

  if (state.ai_bot_user_id) {
    try {
      await getServerClient().deleteUser(state.ai_bot_user_id, {
        hard_delete: true,
      });
    } catch (e) {
      console.warn("Failed to delete bot user", e);
    }
  }
}

export async function getServerlessAgentStatus(
  channelType: string,
  channelId: string
): Promise<{ status: string; persona_id: PersonaId }> {
  const { state } = await getChannelWithState(channelType, channelId);
  const persona_id = readPersonaFromState(state);

  if (state.ai_agent_enabled) {
    return { status: "connected", persona_id };
  }
  return { status: "disconnected", persona_id: DEFAULT_PERSONA_ID };
}

export async function setServerlessPersona(
  channelType: string,
  channelId: string,
  personaId: PersonaId
) {
  await updateChannelAgentState(channelType, channelId, {
    ai_persona_id: personaId,
  });

  const { state } = await getChannelWithState(channelType, channelId);
  if (state.ai_bot_user_id) {
    const persona = getPersona(personaId);
    await getServerClient().upsertUser({
      id: state.ai_bot_user_id,
      name: persona.botDisplayName,
      image: persona.avatarUrl,
    });
  }
}

export function resolvePersonaIdFromInput(persona_id?: string): PersonaId {
  if (persona_id && isValidPersonaId(persona_id)) {
    return persona_id;
  }
  return DEFAULT_PERSONA_ID;
}
