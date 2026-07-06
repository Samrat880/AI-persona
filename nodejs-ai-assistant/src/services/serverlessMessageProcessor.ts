import type OpenAI from "openai";
import type { MessageResponse } from "stream-chat";
import { OpenAIResponseHandler } from "../agents/openai/OpenAIResponseHandler";
import type { PersonaMessageCustom } from "../agents/types";
import { getPersonaInstructions } from "../lib/personaInstructions";
import { createOpenAIClient } from "../lib/openaiSetup";
import {
  getPersona,
  isValidPersonaId,
  type PersonaId,
} from "../personas/config";
import { getServerClient } from "../serverClient";
import {
  getChannelWithState,
  readPersonaFromState,
} from "./channelAgentState";
import {
  buildYouTubeContext,
  formatYouTubeContextForPrompt,
  shouldFetchYouTubeContent,
} from "./youtubeSearch";

interface WebhookMessage {
  id?: string;
  text?: string;
  ai_generated?: boolean;
  user?: { id?: string };
  custom?: PersonaMessageCustom;
}

export async function processServerlessMessage(
  channelType: string,
  channelId: string,
  incomingMessage: WebhookMessage
) {
  if (!incomingMessage.text || incomingMessage.ai_generated) return;
  if (incomingMessage.user?.id?.startsWith("ai-bot")) return;

  const { channel, state } = await getChannelWithState(channelType, channelId);
  if (!state.ai_agent_enabled) return;
  if (!state.openai_thread_id || !state.openai_assistant_id) {
    console.warn(`[Webhook] Missing OpenAI session for channel ${channelId}`);
    return;
  }

  const message = incomingMessage.text;
  let personaId = readPersonaFromState(state);

  const custom = incomingMessage.custom;
  const messagePersonaId = custom?.persona_id;
  if (messagePersonaId && isValidPersonaId(messagePersonaId)) {
    personaId = messagePersonaId;
    if (personaId !== readPersonaFromState(state)) {
      await channel.updatePartial({ set: { ai_persona_id: personaId } });
      const persona = getPersona(personaId);
      const botUserId = state.ai_bot_user_id;
      if (botUserId) {
        await getServerClient().upsertUser({
          id: botUserId,
          name: persona.botDisplayName,
          image: persona.avatarUrl,
        });
      }
    }
  }

  const { message: channelMessage } = await channel.sendMessage({
    text: "",
    ai_generated: true,
  });

  await channel.sendEvent({
    type: "ai_indicator.update",
    ai_state: "AI_STATE_THINKING",
    cid: channelMessage.cid,
    message_id: channelMessage.id,
  });

  let youtubeContext = "";
  const persona = getPersona(personaId);

  if (shouldFetchYouTubeContent(message)) {
    await channel.sendEvent({
      type: "ai_indicator.update",
      ai_state: "AI_STATE_EXTERNAL_SOURCES",
      cid: channelMessage.cid,
      message_id: channelMessage.id,
    });

    console.log(`[YouTube] Webhook search for ${persona.name}: "${message}"`);
    const payload = await buildYouTubeContext(
      persona.social,
      message,
      personaId
    );
    youtubeContext = formatYouTubeContextForPrompt(payload, personaId);
  }

  const openai = createOpenAIClient();

  await openai.beta.threads.messages.create(state.openai_thread_id, {
    role: "user",
    content: message,
  });

  const run = openai.beta.threads.runs.createAndStream(
    state.openai_thread_id,
    {
      assistant_id: state.openai_assistant_id,
      additional_instructions: getPersonaInstructions(
        personaId,
        youtubeContext
      ),
    }
  );

  const handler = new OpenAIResponseHandler(
    openai,
    { id: state.openai_thread_id } as OpenAI.Beta.Threads.Thread,
    run,
    getServerClient(),
    channel,
    channelMessage as MessageResponse,
    personaId,
    () => undefined
  );

  await handler.run();
}
