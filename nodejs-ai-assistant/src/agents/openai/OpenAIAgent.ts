import OpenAI from "openai";
import type { Channel, DefaultGenerics, Event, StreamChat } from "stream-chat";
import {
  DEFAULT_PERSONA_ID,
  formatSocialLinksForPrompt,
  getPersona,
  isValidPersonaId,
  type PersonaId,
} from "../../personas/config";
import {
  buildYouTubeContext,
  formatYouTubeContextForPrompt,
  shouldFetchYouTubeContent,
} from "../../services/youtubeSearch";
import { serverClient } from "../../serverClient";
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

    await serverClient.upsertUser({
      id: this.user.id,
      name: persona.botDisplayName,
      image: persona.avatarUrl,
    });
  };

  init = async () => {
    const apiKey = process.env.OPENAI_API_KEY as string | undefined;
    if (!apiKey) {
      throw new Error("OpenAI API key is required");
    }

    await this.updateBotProfile(this.activePersonaId);

    this.openai = new OpenAI({ apiKey });
    this.assistant = await this.openai.beta.assistants.create({
      name: "Persona Chat Assistant",
      instructions:
        "You are a persona-based chat assistant. Follow the additional instructions provided with each message to stay in character.",
      model: "gpt-4o",
      tools: [
        {
          type: "function",
          function: {
            name: "search_guru_youtube",
            description:
              "Search this mentor's YouTube channel for videos or playlists on a topic. Use when user asks about a new topic mid-conversation.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query for videos or playlists",
                },
              },
              required: ["query"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "web_search",
            description:
              "Search the web for current information. Use only when YouTube results are insufficient.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query",
                },
              },
              required: ["query"],
            },
          },
        },
      ],
      temperature: 0.7,
    });
    this.openAiThread = await this.openai.beta.threads.create();

    this.chatClient.on("message.new", this.handleMessage);
  };

  private getPersonaInstructions = (
    personaId: PersonaId,
    youtubeContext = ""
  ): string => {
    const persona = getPersona(personaId);
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `${persona.systemPrompt}

**Current Date:** ${currentDate}

**Official Social Links:**
${formatSocialLinksForPrompt(persona.social)}

**MANDATORY link rules — NEVER break these:**
- NEVER say "mere paas link nahi hai" or "I don't have a link". You ALWAYS have the official channel link below.
- When user asks for playlist, channel, or video links, you MUST paste clickable markdown links in your reply.
- Format: [Title](https://www.youtube.com/...)
- Use ONLY links from the YouTube data section below or official social links above — never invent URLs.
- When playlists or videos are listed below, include at least 1 channel link AND 1-3 playlist/video links.
- Answer in Hinglish mentor voice, then give the links clearly.

**Web Search:** Only for news/current events when YouTube data below is not enough.

**Response Format:**
- Stay fully in character as ${persona.name}
- Be direct and conversational${youtubeContext}`;
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
      const payload = await buildYouTubeContext(persona.social, message);

      if (payload.error) {
        console.warn(`[YouTube] Issue: ${payload.error}`);
      } else {
        console.log(
          `[YouTube] Found ${payload.playlists.length} playlists, ${payload.videos.length} videos`
        );
      }

      youtubeContext = formatYouTubeContextForPrompt(payload);
    }

    await this.openai.beta.threads.messages.create(this.openAiThread.id, {
      role: "user",
      content: message,
    });

    const run = this.openai.beta.threads.runs.createAndStream(
      this.openAiThread.id,
      {
        assistant_id: this.assistant.id,
        additional_instructions: this.getPersonaInstructions(
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
