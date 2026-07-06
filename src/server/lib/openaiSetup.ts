import OpenAI from "openai";

let cachedAssistantId: string | null =
  process.env.OPENAI_ASSISTANT_ID?.trim() || null;

export function createOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key is required");
  }
  return new OpenAI({ apiKey });
}

export async function createPersonaAssistant(openai: OpenAI) {
  return openai.beta.assistants.create({
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
}

/** Reuse one assistant across channels — avoids slow create on every Connect. */
export async function getOrCreatePersonaAssistant(
  openai: OpenAI
): Promise<{ id: string }> {
  if (cachedAssistantId) {
    return { id: cachedAssistantId };
  }

  const assistant = await createPersonaAssistant(openai);
  cachedAssistantId = assistant.id;
  return assistant;
}
