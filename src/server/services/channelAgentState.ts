import type { Channel } from "stream-chat";
import {
  DEFAULT_PERSONA_ID,
  isValidPersonaId,
  type PersonaId,
} from "~/server/personas/config";
import { getServerClient } from "~/server/stream/serverClient";

export interface ChannelAgentState {
  ai_agent_enabled?: boolean;
  ai_persona_id?: string;
  openai_thread_id?: string;
  openai_assistant_id?: string;
  ai_bot_user_id?: string;
  [key: string]: string | boolean | undefined;
}

export function getBotUserId(channelId: string) {
  return `ai-bot-${channelId.replace(/[!]/g, "")}`;
}

export function isStreamDeletedUserError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("was deleted");
}

export function resolvePersonaId(persona_id?: string): PersonaId {
  if (persona_id && isValidPersonaId(persona_id)) {
    return persona_id;
  }
  return DEFAULT_PERSONA_ID;
}

export async function getChannelWithState(
  channelType: string,
  channelId: string
): Promise<{ channel: Channel; state: ChannelAgentState }> {
  const channel = getServerClient().channel(channelType, channelId);
  const response = await channel.query();
  const ch = response.channel as ChannelAgentState;
  const state: ChannelAgentState = {
    ai_agent_enabled: ch.ai_agent_enabled,
    ai_persona_id: ch.ai_persona_id,
    openai_thread_id: ch.openai_thread_id,
    openai_assistant_id: ch.openai_assistant_id,
    ai_bot_user_id: ch.ai_bot_user_id,
  };
  return { channel, state };
}

export async function updateChannelAgentState(
  channelType: string,
  channelId: string,
  patch: Partial<ChannelAgentState>
) {
  const channel = getServerClient().channel(channelType, channelId);
  await channel.updatePartial({ set: patch });
}

export function readPersonaFromState(state: ChannelAgentState): PersonaId {
  if (state.ai_persona_id && isValidPersonaId(state.ai_persona_id)) {
    return state.ai_persona_id;
  }
  return DEFAULT_PERSONA_ID;
}
