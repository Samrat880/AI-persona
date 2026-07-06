import { createOpenAIClient, getOrCreatePersonaAssistant } from "../lib/openaiSetup";
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
  isStreamDeletedUserError,
  readPersonaFromState,
  updateChannelAgentState,
  type ChannelAgentState,
} from "./channelAgentState";

async function provisionBotUser(
  channelType: string,
  channelId: string,
  personaId: PersonaId,
  preferredBotUserId?: string
): Promise<string> {
  const persona = getPersona(personaId);
  const channel = getServerClient().channel(channelType, channelId);
  const defaultId = getBotUserId(channelId);
  const candidateIds = [
    preferredBotUserId,
    defaultId,
    `${defaultId}-r1`,
    `${defaultId}-r2`,
  ].filter((id, index, list): id is string => !!id && list.indexOf(id) === index);

  for (const userId of candidateIds) {
    try {
      await getServerClient().upsertUser({
        id: userId,
        name: persona.botDisplayName,
        image: persona.avatarUrl,
      });
      await channel.addMembers([userId]);
      return userId;
    } catch (error) {
      if (!isStreamDeletedUserError(error)) {
        throw error;
      }
      console.warn(`[Agent] Bot user ${userId} was deleted; trying next id`);
    }
  }

  const fallbackId = `${defaultId}-${Date.now()}`;
  await getServerClient().upsertUser({
    id: fallbackId,
    name: persona.botDisplayName,
    image: persona.avatarUrl,
  });
  await channel.addMembers([fallbackId]);
  return fallbackId;
}

export async function startServerlessAgent(
  channelType: string,
  channelId: string,
  personaId: PersonaId
): Promise<ChannelAgentState> {
  const channel = getServerClient().channel(channelType, channelId);
  const { state: existing } = await getChannelWithState(channelType, channelId);

  if (
    existing.ai_agent_enabled &&
    existing.openai_thread_id &&
    existing.openai_assistant_id &&
    existing.ai_bot_user_id
  ) {
    try {
      await getServerClient().upsertUser({
        id: existing.ai_bot_user_id,
        name: getPersona(personaId).botDisplayName,
        image: getPersona(personaId).avatarUrl,
      });
      await channel.addMembers([existing.ai_bot_user_id]);
    } catch (error) {
      if (!isStreamDeletedUserError(error)) {
        throw error;
      }
      existing.ai_bot_user_id = await provisionBotUser(
        channelType,
        channelId,
        personaId
      );
    }

    if (existing.ai_persona_id !== personaId) {
      await channel.updatePartial({ set: { ai_persona_id: personaId } });
    }

    return { ...existing, ai_persona_id: personaId };
  }

  const botUserId = await provisionBotUser(
    channelType,
    channelId,
    personaId,
    existing.ai_bot_user_id
  );

  const openai = createOpenAIClient();
  const assistantId =
    existing.openai_assistant_id ??
    (await getOrCreatePersonaAssistant(openai)).id;
  const threadId =
    existing.openai_thread_id ?? (await openai.beta.threads.create()).id;

  const state: ChannelAgentState = {
    ai_agent_enabled: true,
    ai_persona_id: personaId,
    openai_thread_id: threadId,
    openai_assistant_id: assistantId,
    ai_bot_user_id: botUserId,
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
      await channel.removeMembers([state.ai_bot_user_id]);
    } catch (e) {
      console.warn("Failed to remove bot from channel", e);
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
    try {
      await getServerClient().upsertUser({
        id: state.ai_bot_user_id,
        name: persona.botDisplayName,
        image: persona.avatarUrl,
      });
    } catch (error) {
      if (!isStreamDeletedUserError(error)) {
        throw error;
      }
      await provisionBotUser(
        channelType,
        channelId,
        personaId,
        state.ai_bot_user_id
      );
    }
  }
}

export function resolvePersonaIdFromInput(persona_id?: string): PersonaId {
  if (persona_id && isValidPersonaId(persona_id)) {
    return persona_id;
  }
  return DEFAULT_PERSONA_ID;
}
