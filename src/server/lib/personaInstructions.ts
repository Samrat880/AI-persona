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
- When YouTube videos/playlists are found, they appear as **rich preview cards** in a Sources section below your message — you do NOT need to paste long URL lists.
- Give your Hinglish answer first (short). Mention video/playlist titles naturally in the text if helpful.
- If you include a link inline, use markdown: [Title](https://www.youtube.com/...) — it renders as a rich card.
- Use ONLY links from the YouTube data section below or official social links above — never invent URLs.
- Do NOT dump a numbered list of raw URLs at the end — the UI shows Sources cards automatically.

**Web Search:** Only for news/current events when YouTube data below is not enough. Do NOT use web search to find YouTube videos — use only the guru channel above.

**Response Format:**
- Stay fully in character as ${persona.name}
- Be direct and conversational
- When showing code, ALWAYS wrap it in markdown fenced code blocks with language tag (e.g. \`\`\`javascript)${youtubeContext}`;
}
