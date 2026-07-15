import type OpenAI from "openai";
import type { MessageResponse } from "stream-chat";
import type { YouTubeSource } from "~/lib/youtube-sources";
import { OpenAIResponseHandler } from "~/server/agents/openai/OpenAIResponseHandler";
import { getAdditionalRunInstructions } from "~/server/lib/personaInstructions";
import { createOpenAIClient } from "~/server/lib/openaiSetup";
import {
  getPersonaMeta,
  isValidPersonaId,
  type PersonaId,
} from "~/server/personas/config";
import { getServerClient } from "~/server/stream/serverClient";
import { sendBotChannelEvent } from "~/server/stream/botActions";
import {
  processServerlessMessageInputSchema,
  type ProcessServerlessMessageInput,
} from "~/server/schemas/chat";
import {
  getBotUserId,
  getChannelWithState,
  readPersonaFromState,
  updateChannelAgentState,
} from "./channelAgentState";
import { syncPersonaOpenAISession } from "./personaSession";
import { startServerlessAgent } from "./serverlessAgentLifecycle";
import {
  registerGeneration,
  unregisterGeneration,
} from "./generationRegistry";
import { trimThreadHistory } from "./threadHistory";
import {
  buildYouTubeContext,
  buildYouTubeSourcesFromPayload,
  formatYouTubeContextForPrompt,
  shouldFetchYouTubeContent,
} from "./youtubeSearch";

export async function processServerlessMessage(
  channelType: string,
  channelId: string,
  incomingMessage: ProcessServerlessMessageInput | Record<string, unknown>
) {
  const parsed = processServerlessMessageInputSchema.safeParse(incomingMessage);
  if (!parsed.success) {
    console.warn(
      "[process] Invalid message payload:",
      parsed.error.flatten()
    );
    return;
  }

  const message = parsed.data;

  if (message.ai_generated) return;
  if (message.user?.id?.startsWith("ai-bot")) return;

  const { channel, state: initialState } = await getChannelWithState(
    channelType,
    channelId
  );

  if (
    message.id &&
    initialState.last_processed_message_id === message.id
  ) {
    return;
  }

  if (message.id) {
    await updateChannelAgentState(channelType, channelId, {
      last_processed_message_id: message.id,
    });
  }

  let state = initialState;

  // Respect an explicit disconnect. A plain user message must NOT silently
  // re-enable the agent — only the explicit Connect/start flow may do that.
  // `false` means the user disconnected; `undefined` means never started yet
  // (first message on a brand-new channel), which is still allowed to bootstrap.
  if (state.ai_agent_enabled === false) {
    return;
  }

  if (
    !state.ai_agent_enabled ||
    !state.openai_thread_id ||
    !state.openai_assistant_id ||
    !state.ai_bot_user_id
  ) {
    const personaFromMessage = message.custom?.persona_id;
    const bootstrapPersona =
      personaFromMessage && isValidPersonaId(personaFromMessage)
        ? personaFromMessage
        : readPersonaFromState(state);
    state = await startServerlessAgent(
      channelType,
      channelId,
      bootstrapPersona
    );
  }

  if (!state.ai_agent_enabled) return;
  if (!state.openai_thread_id || !state.openai_assistant_id) {
    console.warn(`[Webhook] Missing OpenAI session for channel ${channelId}`);
    return;
  }

  const botUserId = state.ai_bot_user_id ?? getBotUserId(channelId);
  const messageText = message.text;
  let personaId: PersonaId = readPersonaFromState(state);

  const messagePersonaId = message.custom?.persona_id;
  if (messagePersonaId && isValidPersonaId(messagePersonaId)) {
    personaId = messagePersonaId;
    if (personaId !== readPersonaFromState(state)) {
      const persona = getPersonaMeta(personaId);
      await getServerClient().upsertUser({
        id: botUserId,
        name: persona.botDisplayName,
        image: persona.avatarUrl,
      });
    }
  }

  const openai = createOpenAIClient();

  state = await syncPersonaOpenAISession(
    openai,
    channelType,
    channelId,
    state,
    personaId
  );

  const { message: channelMessage } = await channel.sendMessage({
    text: "",
    ai_generated: true,
    user_id: botUserId,
    custom: { generating: true },
  });

  await sendBotChannelEvent(channel, botUserId, {
    type: "ai_indicator.update",
    ai_state: "AI_STATE_THINKING",
    cid: channelMessage.cid,
    message_id: channelMessage.id,
  });

  let youtubeContext = "";
  let youtubeSources: YouTubeSource[] = [];
  const persona = getPersonaMeta(personaId);

  if (shouldFetchYouTubeContent(messageText)) {
    await sendBotChannelEvent(channel, botUserId, {
      type: "ai_indicator.update",
      ai_state: "AI_STATE_EXTERNAL_SOURCES",
      cid: channelMessage.cid,
      message_id: channelMessage.id,
    });

    console.log(`[YouTube] Search for ${persona.name}: "${messageText}"`);
    const payload = await buildYouTubeContext(
      persona.social,
      messageText,
      personaId
    );
    youtubeContext = formatYouTubeContextForPrompt(payload, personaId);
    youtubeSources = buildYouTubeSourcesFromPayload(payload, personaId);
  }

  await trimThreadHistory(openai, state.openai_thread_id!);

  await openai.beta.threads.messages.create(state.openai_thread_id!, {
    role: "user",
    content: messageText,
  });

  const additionalInstructions = getAdditionalRunInstructions(youtubeContext);

  const run = openai.beta.threads.runs.createAndStream(
    state.openai_thread_id!,
    {
      assistant_id: state.openai_assistant_id!,
      additional_instructions: additionalInstructions,
    }
  );

  const handler = new OpenAIResponseHandler(
    openai,
    { id: state.openai_thread_id! } as OpenAI.Beta.Threads.Thread,
    run,
    getServerClient(),
    channel,
    channelMessage as MessageResponse,
    personaId,
    botUserId,
    () => unregisterGeneration(channelMessage.id),
    youtubeSources
  );

  registerGeneration(channelMessage.id, () => handler.stop());

  await handler.run();
}
