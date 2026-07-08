import type OpenAI from "openai";
import { getOrCreatePersonaAssistant } from "~/server/lib/openaiSetup";
import type { PersonaId } from "~/server/personas/config";
import {
  updateChannelAgentState,
  type ChannelAgentState,
} from "./channelAgentState";

/** Ensure channel uses the correct persona assistant; reset thread when persona changes. */
export async function syncPersonaOpenAISession(
  openai: OpenAI,
  channelType: string,
  channelId: string,
  state: ChannelAgentState,
  personaId: PersonaId
): Promise<ChannelAgentState> {
  const { id: assistantId } = await getOrCreatePersonaAssistant(
    openai,
    personaId
  );

  const personaChanged =
    state.ai_persona_id !== personaId ||
    state.openai_assistant_id !== assistantId;

  if (!personaChanged && state.openai_thread_id) {
    return {
      ...state,
      ai_persona_id: personaId,
      openai_assistant_id: assistantId,
    };
  }

  const thread = await openai.beta.threads.create();
  const patch = {
    ai_persona_id: personaId,
    openai_assistant_id: assistantId,
    openai_thread_id: thread.id,
  };

  await updateChannelAgentState(channelType, channelId, patch);

  if (personaChanged && state.openai_thread_id) {
    console.log(
      `[persona] Switched ${channelId} to ${personaId} — new thread ${thread.id}`
    );
  }

  return { ...state, ...patch };
}
