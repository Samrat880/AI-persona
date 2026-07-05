import type { Channel, StreamChat, User } from "stream-chat";
import type { PersonaId } from "../personas/config";

export interface AIAgent {
  user?: User;
  channel: Channel;
  chatClient: StreamChat;
  activePersonaId: PersonaId;
  getLastInteraction: () => number;
  init: () => Promise<void>;
  dispose: () => Promise<void>;
  setPersona: (personaId: PersonaId) => Promise<void>;
}

export enum AgentPlatform {
  OPENAI = "openai",
  WRITING_ASSISTANT = "writing_assistant",
}

export interface PersonaMessageCustom {
  persona_id?: PersonaId;
}
