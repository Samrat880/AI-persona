import OpenAI from "openai";
import { buildPersonaAssistantInstructions } from "~/server/lib/personaAssistantInstructions";
import type { PersonaId } from "~/server/personas/config";
import { PERSONA_IDS } from "~/server/personas/config";

const ASSISTANT_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_guru_youtube",
      description:
        "Search this mentor's YouTube channel for videos or playlists. Use when user asks for videos, playlists, or a new topic needs channel content.",
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
    type: "function" as const,
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
];

const assistantIdCache = new Map<PersonaId, string>();

function legacyAssistantEnvKey(personaId: PersonaId): string | undefined {
  if (personaId === "hitesh") {
    return process.env.OPENAI_ASSISTANT_ID?.trim() || undefined;
  }
  return process.env.OPENAI_ASSISTANT_ID_PIYUSH?.trim() || undefined;
}

export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }
  return new OpenAI({ apiKey });
}

async function createPersonaAssistant(
  openai: OpenAI,
  personaId: PersonaId
) {
  const instructions = await buildPersonaAssistantInstructions(personaId);
  const meta = personaId === "hitesh" ? "Hitesh" : "Piyush";

  return openai.beta.assistants.create({
    name: `Guru Chat — ${meta}`,
    instructions,
    model: "gpt-4o",
    tools: ASSISTANT_TOOLS,
    temperature: 0.7,
  });
}

/** One cached assistant per persona — persona prompt lives in assistant instructions, not additional_instructions. */
export async function getOrCreatePersonaAssistant(
  openai: OpenAI,
  personaId: PersonaId
): Promise<{ id: string }> {
  const cached = assistantIdCache.get(personaId);
  if (cached) {
    return { id: cached };
  }

  const legacyId = legacyAssistantEnvKey(personaId);
  if (legacyId) {
    assistantIdCache.set(personaId, legacyId);
    return { id: legacyId };
  }

  const assistant = await createPersonaAssistant(openai, personaId);
  assistantIdCache.set(personaId, assistant.id);
  console.log(`[OpenAI] Created assistant for ${personaId}: ${assistant.id}`);
  return assistant;
}

export async function warmupPersonaAssistants(): Promise<void> {
  const openai = createOpenAIClient();
  await Promise.all(
    PERSONA_IDS.map((id) => getOrCreatePersonaAssistant(openai, id))
  );
}
