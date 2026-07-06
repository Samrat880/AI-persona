import {
  formatSocialLinksForPrompt,
  getPersona,
  type PersonaId,
} from "~/server/personas/config";
import { getYouTubeChannelRule } from "~/server/services/youtubeSearch";

export function getPersonaInstructions(
  personaId: PersonaId,
  youtubeContext = ""
): string {
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

**MANDATORY YouTube channel rules — NEVER break these:**
${getYouTubeChannelRule(personaId)}
- NEVER say "mere paas link nahi hai" or "I don't have a link". You ALWAYS have the official channel link below.
- When user asks for playlist, channel, or video links, you MUST paste clickable markdown links in your reply.
- Format: [Title](https://www.youtube.com/...)
- Use ONLY links from the YouTube data section below or official social links above — never invent URLs.
- When playlists or videos are listed below, include at least 1 channel link AND 1-3 playlist/video links.
- Answer in Hinglish mentor voice, then give the links clearly.

**Web Search:** Only for news/current events when YouTube data below is not enough. Do NOT use web search to find YouTube videos — use only the guru channel above.

**Response Format:**
- Stay fully in character as ${persona.name}
- Be direct and conversational
- When showing code, ALWAYS wrap it in markdown fenced code blocks with language tag (e.g. \`\`\`javascript)${youtubeContext}`;
}
