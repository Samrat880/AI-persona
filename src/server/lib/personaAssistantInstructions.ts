import {
  formatSocialLinksForPrompt,
  getPersonaMeta,
  getPersonaPrompt,
  type PersonaId,
} from "~/server/personas/config";
import { getYouTubeChannelRule } from "~/server/services/youtubeSearch";

/** Static instructions baked into each persona's OpenAI assistant (sent once per run via assistant_id, not repeated in additional_instructions). */
export async function buildPersonaAssistantInstructions(
  personaId: PersonaId
): Promise<string> {
  const persona = getPersonaMeta(personaId);
  const systemPrompt = await getPersonaPrompt(personaId);

  return `${systemPrompt}

**Official Social Links:**
${formatSocialLinksForPrompt(persona.social)}

**MANDATORY YouTube channel rules — NEVER break these:**
${getYouTubeChannelRule(personaId)}
- NEVER say "mere paas link nahi hai" or "I don't have a link".
- YouTube links render as rich preview cards in a Sources section — mention titles briefly in text, do not dump raw URL lists.
- Use ONLY links from this mentor's channel or from tool/search context — never invent URLs.

**Web Search:** Only for news/current events when YouTube data is not enough. Do NOT use web search to find YouTube videos.

**Response Format:**
- Stay fully in character as ${persona.name}
- Be direct and conversational
- When showing code, ALWAYS wrap it in markdown fenced code blocks with language tag (e.g. \`\`\`javascript)`;
}
