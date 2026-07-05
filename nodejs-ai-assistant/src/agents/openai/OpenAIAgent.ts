import OpenAI from "openai";
import type { Channel, DefaultGenerics, Event, StreamChat } from "stream-chat";
import {
  DEFAULT_PERSONA_ID,
  getPersona,
  isValidPersonaId,
  type PersonaId,
} from "../../personas/config";
import { getPersonaInstructions } from "../../lib/personaInstructions";
import { createOpenAIClient, createPersonaAssistant } from "../../lib/openaiSetup";
import { getServerClient } from "../../serverClient";
import {
  buildYouTubeContext,
  formatYouTubeContextForPrompt,
  shouldFetchYouTubeContent,
} from "../../services/youtubeSearch";
import type { AIAgent, PersonaMessageCustom } from "../types";
import { OpenAIResponseHandler } from "./OpenAIResponseHandler";

export class OpenAIAgent implements AIAgent {
  private openai?: OpenAI;
  private assistant?: OpenAI.Beta.Assistants.Assistant;
  private openAiThread?: OpenAI.Beta.Threads.Thread;
  private lastInteractionTs = Date.now();

  private handlers: OpenAIResponseHandler[] = [];

  activePersonaId: PersonaId;

  constructor(
    readonly chatClient: StreamChat,
    readonly channel: Channel,
    personaId: PersonaId = DEFAULT_PERSONA_ID
  ) {
    this.activePersonaId = personaId;
  }

  dispose = async () => {
    this.chatClient.off("message.new", this.handleMessage);
    await this.chatClient.disconnectUser();

    this.handlers.forEach((handler) => handler.dispose());
    this.handlers = [];
  };

  get user() {
    return this.chatClient.user;
  }

  getLastInteraction = (): number => this.lastInteractionTs;

  setPersona = async (personaId: PersonaId) => {
    this.activePersonaId = personaId;
    await this.updateBotProfile(personaId);
  };

  private updateBotProfile = async (personaId: PersonaId) => {
    const persona = getPersona(personaId);
    if (!this.user?.id) return;

    await getServerClient().upsertUser({
      id: this.user.id,
      name: persona.botDisplayName,
      image: persona.avatarUrl,
    });
  };

  init = async () => {
    this.openai = createOpenAIClient();
    await this.updateBotProfile(this.activePersonaId);
    this.assistant = await createPersonaAssistant(this.openai);
    this.openAiThread = await this.openai.beta.threads.create();

    this.chatClient.on("message.new", this.handleMessage);
  };

  private handleMessage = async (e: Event<DefaultGenerics>) => {
    if (!this.openai || !this.openAiThread || !this.assistant) {
      console.log("OpenAI not initialized");
      return;
    }

    if (!e.message || e.message.ai_generated) {
      return;
    }

    const message = e.message.text;
    if (!message) return;

    this.lastInteractionTs = Date.now();

    const custom = e.message.custom as PersonaMessageCustom | undefined;
    const messagePersonaId = custom?.persona_id;
    const personaId =
      messagePersonaId && isValidPersonaId(messagePersonaId)
        ? messagePersonaId
        : this.activePersonaId;

    if (personaId !== this.activePersonaId) {
      await this.setPersona(personaId);
    }

    const { message: channelMessage } = await this.channel.sendMessage({
      text: "",
      ai_generated: true,
    });

    await this.channel.sendEvent({
      type: "ai_indicator.update",
      ai_state: "AI_STATE_THINKING",
      cid: channelMessage.cid,
      message_id: channelMessage.id,
    });

    let youtubeContext = "";
    const persona = getPersona(personaId);

    if (shouldFetchYouTubeContent(message)) {
      await this.channel.sendEvent({
        type: "ai_indicator.update",
        ai_state: "AI_STATE_EXTERNAL_SOURCES",
        cid: channelMessage.cid,
        message_id: channelMessage.id,
      });

      console.log(
        `[YouTube] Fetching content for ${persona.name}: "${message}"`
      );
      const payload = await buildYouTubeContext(
        persona.social,
        message,
        personaId
      );

      if (payload.error) {
        console.warn(`[YouTube] Issue: ${payload.error}`);
      } else {
        console.log(
          `[YouTube] Found ${payload.playlists.length} playlists, ${payload.videos.length} videos`
        );
      }

      youtubeContext = formatYouTubeContextForPrompt(payload, personaId);
    }

    await this.openai.beta.threads.messages.create(this.openAiThread.id, {
      role: "user",
      content: message,
    });

    const run = this.openai.beta.threads.runs.createAndStream(
      this.openAiThread.id,
      {
        assistant_id: this.assistant.id,
        additional_instructions: getPersonaInstructions(
          personaId,
          youtubeContext
        ),
      }
    );

    const handler = new OpenAIResponseHandler(
      this.openai,
      this.openAiThread,
      run,
      this.chatClient,
      this.channel,
      channelMessage,
      personaId,
      () => this.removeHandler(handler)
    );
    this.handlers.push(handler);
    void handler.run();
  };

  private removeHandler = (handlerToRemove: OpenAIResponseHandler) => {
    this.handlers = this.handlers.filter(
      (handler) => handler !== handlerToRemove
    );
  };
}
