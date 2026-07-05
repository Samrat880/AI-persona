import type { PersonaId, SocialLinks } from "../personas/config";
import { getPersona, PERSONA_IDS } from "../personas/config";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

/** Only these two guru channels may be recommended in chat. */
export const ALLOWED_YOUTUBE_CHANNELS: Record<
  PersonaId,
  { handle: string; name: string; url: string }
> = {
  hitesh: {
    handle: "chaiaurcode",
    name: "Chai aur Code",
    url: "https://www.youtube.com/@chaiaurcode",
  },
  piyush: {
    handle: "piyushgargdev",
    name: "Piyush Garg Dev",
    url: "https://www.youtube.com/@piyushgargdev",
  },
};

const ALLOWED_HANDLES = new Set(
  Object.values(ALLOWED_YOUTUBE_CHANNELS).map((c) => c.handle.toLowerCase())
);

export function getYouTubeChannelRule(personaId: PersonaId): string {
  const allowed = ALLOWED_YOUTUBE_CHANNELS[personaId];
  const other = Object.entries(ALLOWED_YOUTUBE_CHANNELS)
    .filter(([id]) => id !== personaId)
    .map(([, c]) => `@${c.handle} (${c.name})`)
    .join(", ");

  return `- ONLY recommend YouTube videos/playlists from **@${allowed.handle}** (${allowed.name}): ${allowed.url}
- NEVER link to any other YouTube channel — not Traversy Media, freeCodeCamp, old ChaiCode, Hitesh's other channels, or random tutorials
- The only other allowed guru channel in this app is ${other} — recommend that ONLY if the user explicitly asks to compare gurus or switch mentors
- Use ONLY YouTube URLs from the search results below — never invent or guess video IDs`;
}

export function isAllowedYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "youtube.com" && host !== "youtu.be") return true;

    const path = parsed.pathname;
    const handleMatch = path.match(/\/@([^/]+)/);
    if (handleMatch) {
      return ALLOWED_HANDLES.has(handleMatch[1].toLowerCase());
    }

    // watch?v= and playlist?list= URLs come from our channel-scoped API search
    return (
      path.startsWith("/watch") ||
      path.startsWith("/playlist") ||
      path === "/"
    );
  } catch {
    return false;
  }
}

const channelIdCache = new Map<string, string>();

const GREETING_PATTERN =
  /^(hi|hello|hey|namaste|hola|yo|sup|kaise ho|kya haal|good morning|good evening|good night)[\s!?.]*$/i;

const PURE_SOCIAL_PATTERN =
  /\b(instagram|insta|twitter|x\.com|linkedin|website)\b/i;

const YOUTUBE_CONTENT_REQUEST =
  /\b(playlist|playlists|video|videos|link|links|channel|youtube|chaicode|chaiaurcode|teachme|tutorial|course|series|subscribe|dekho|batao|do|share|send)\b/i;

const LEARNING_PATTERN =
  /\b(explain|how to|how do|what is|what are|samjhao|batao|teach|tutorial|video|roadmap|project|build|code|react|node|javascript|mern|api|debug|error|learn|seekho|help me|best way|guide|portfolio|deploy|database|mongodb|express|typescript|css|html|full.?stack|backend|frontend)\b/i;

export interface YouTubeVideoResult {
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
}

export interface YouTubePlaylistResult {
  title: string;
  url: string;
  description: string;
  thumbnail: string;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideoResult[];
  playlists: YouTubePlaylistResult[];
  channelId?: string;
  channelUrl?: string;
  error?: string;
}

export interface YouTubeContextPayload {
  channelUrl: string;
  channelId?: string;
  videos: YouTubeVideoResult[];
  playlists: YouTubePlaylistResult[];
  error?: string;
}

function getApiKey(): string | undefined {
  return process.env.YOUTUBE_API_KEY;
}

export function extractYouTubeHandle(youtubeUrl: string): string | null {
  try {
    const url = new URL(youtubeUrl);
    const handleMatch = url.pathname.match(/\/@([^/]+)/);
    if (handleMatch) return handleMatch[1];
    return null;
  } catch {
    return null;
  }
}

export function isPlaylistRequest(message: string): boolean {
  return /\b(playlist|playlists|series|course)\b/i.test(message);
}

export function shouldFetchYouTubeContent(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length < 3) return false;
  if (GREETING_PATTERN.test(trimmed)) return false;

  if (YOUTUBE_CONTENT_REQUEST.test(trimmed)) return true;
  if (LEARNING_PATTERN.test(trimmed)) return true;

  const isPureSocial =
    PURE_SOCIAL_PATTERN.test(trimmed) &&
    !YOUTUBE_CONTENT_REQUEST.test(trimmed) &&
    !LEARNING_PATTERN.test(trimmed);
  if (isPureSocial) return false;

  return trimmed.length >= 8;
}

/** @deprecated use shouldFetchYouTubeContent */
export function isLearningQuestion(message: string): boolean {
  return shouldFetchYouTubeContent(message);
}

export function formatYouTubeContextForPrompt(
  payload: YouTubeContextPayload,
  personaId?: PersonaId
): string {
  const channelMeta = personaId ? ALLOWED_YOUTUBE_CHANNELS[personaId] : null;
  const channelLabel = channelMeta
    ? `${channelMeta.name} (@${channelMeta.handle})`
    : "this mentor's channel";

  const parts: string[] = [];

  parts.push(
    `\n\n**Official YouTube channel — ${channelLabel} (ONLY channel you may recommend):**\n[${channelLabel}](${payload.channelUrl})`
  );

  if (payload.playlists.length > 0) {
    const lines = payload.playlists
      .slice(0, 5)
      .map((p, i) => `${i + 1}. [${p.title}](${p.url})`);
    parts.push(
      `\n**Playlists from this channel (MUST include 1-5 as markdown links when user asks for playlists):**\n${lines.join("\n")}`
    );
  }

  if (payload.videos.length > 0) {
    const lines = payload.videos
      .slice(0, 3)
      .map((v, i) => `${i + 1}. [${v.title}](${v.url})`);
    parts.push(
      `\n**Relevant videos from this channel (MUST include 1-3 as markdown links):**\n${lines.join("\n")}`
    );
  }

  if (payload.error) {
    parts.push(
      `\n**Note:** YouTube search had an issue (${payload.error}). Still share the official channel link above.`
    );
  }

  return parts.join("\n");
}

/** @deprecated use formatYouTubeContextForPrompt */
export function formatVideosForPrompt(videos: YouTubeVideoResult[]): string {
  if (!videos.length) return "";
  const lines = videos
    .slice(0, 3)
    .map((v, i) => `${i + 1}. [${v.title}](${v.url})`);
  return `\n\n**Relevant videos from this mentor's YouTube channel (MUST include 1-3 of these links in your reply):**\n${lines.join("\n")}`;
}

export async function resolveChannelId(
  social: SocialLinks,
  personaId?: PersonaId
): Promise<string | null> {
  const expected =
    personaId && ALLOWED_YOUTUBE_CHANNELS[personaId]
      ? ALLOWED_YOUTUBE_CHANNELS[personaId].url
      : null;

  if (expected && social.youtube !== expected) {
    console.warn(
      `[YouTube] Channel URL mismatch for ${personaId}: expected ${expected}, got ${social.youtube}`
    );
    social.youtube = expected;
  }

  if (social.youtubeChannelId) {
    return social.youtubeChannelId;
  }

  const handle = extractYouTubeHandle(social.youtube);
  if (!handle) return null;

  const cacheKey = handle.toLowerCase();
  if (channelIdCache.has(cacheKey)) {
    return channelIdCache.get(cacheKey) ?? null;
  }

  const apiKey = getApiKey();
  if (!apiKey) return null;

  const params = new URLSearchParams({
    part: "id",
    forHandle: handle,
    key: apiKey,
  });

  const response = await fetch(
    `${YOUTUBE_API_BASE}/channels?${params.toString()}`
  );

  if (!response.ok) {
    console.error("YouTube channel resolve failed:", await response.text());
    return null;
  }

  const data = (await response.json()) as {
    items?: Array<{ id: string }>;
  };

  const channelId = data.items?.[0]?.id ?? null;
  if (channelId) {
    channelIdCache.set(cacheKey, channelId);
    social.youtubeChannelId = channelId;
  }

  return channelId;
}

export async function warmupYouTubeChannels(): Promise<void> {
  if (!getApiKey()) {
    console.warn(
      "[YouTube] YOUTUBE_API_KEY not set — video search will be unavailable."
    );
    return;
  }

  for (const personaId of PERSONA_IDS) {
    const persona = getPersona(personaId);
    const channelId = await resolveChannelId(persona.social, personaId);
    if (channelId) {
      console.log(
        `[YouTube] Resolved ${persona.name} channel: ${channelId} (${persona.social.youtube})`
      );
    } else {
      console.error(
        `[YouTube] Failed to resolve channel for ${persona.name}: ${persona.social.youtube}`
      );
    }
  }
}

function extractSearchQuery(message: string): string {
  const cleaned = message
    .replace(
      /\b(aap|apne|mera|mujhe|de do|batao|link|links|playlist|playlists|channel|youtube|ka|ki|ke|hi|please|chahiye|do|share|send)\b/gi,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 2 ? cleaned : "web development tutorial";
}

async function searchChannelPlaylists(
  channelId: string,
  query: string,
  maxResults = 5
): Promise<YouTubePlaylistResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    part: "snippet",
    channelId,
    q: query || "tutorial",
    type: "playlist",
    maxResults: String(maxResults),
    order: "relevance",
    key: apiKey,
  });

  const response = await fetch(
    `${YOUTUBE_API_BASE}/search?${params.toString()}`
  );

  if (!response.ok) {
    console.error(`YouTube playlist search failed:`, await response.text());
    return [];
  }

  const data = (await response.json()) as {
    items?: Array<{
      id: { playlistId: string };
      snippet: {
        title: string;
        description: string;
        thumbnails?: { medium?: { url: string } };
      };
    }>;
  };

  return (data.items ?? []).map((item) => ({
    title: item.snippet.title,
    url: `https://www.youtube.com/playlist?list=${item.id.playlistId}`,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails?.medium?.url ?? "",
  }));
}

async function searchChannelVideos(
  channelId: string,
  query: string,
  maxResults = 5
): Promise<YouTubeVideoResult[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const params = new URLSearchParams({
    part: "snippet",
    channelId,
    q: query,
    type: "video",
    maxResults: String(maxResults),
    order: "relevance",
    key: apiKey,
  });

  const response = await fetch(
    `${YOUTUBE_API_BASE}/search?${params.toString()}`
  );

  if (!response.ok) {
    console.error(`YouTube video search failed:`, await response.text());
    return [];
  }

  const data = (await response.json()) as {
    items?: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        publishedAt: string;
        thumbnails?: { medium?: { url: string } };
      };
    }>;
  };

  return (data.items ?? []).map((item) => ({
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    description: item.snippet.description,
    publishedAt: item.snippet.publishedAt,
    thumbnail: item.snippet.thumbnails?.medium?.url ?? "",
  }));
}

export async function buildYouTubeContext(
  social: SocialLinks,
  message: string,
  personaId?: PersonaId
): Promise<YouTubeContextPayload> {
  const channelUrl =
    personaId && ALLOWED_YOUTUBE_CHANNELS[personaId]
      ? ALLOWED_YOUTUBE_CHANNELS[personaId].url
      : social.youtube;
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      channelUrl,
      videos: [],
      playlists: [],
      error: "YouTube API key not configured.",
    };
  }

  const channelId = await resolveChannelId(social, personaId);
  if (!channelId) {
    return {
      channelUrl,
      videos: [],
      playlists: [],
      error: "Could not resolve YouTube channel.",
    };
  }

  const searchQuery = extractSearchQuery(message);
  const wantPlaylists = isPlaylistRequest(message);

  const [playlists, videos] = await Promise.all([
    wantPlaylists || YOUTUBE_CONTENT_REQUEST.test(message)
      ? searchChannelPlaylists(
          channelId,
          wantPlaylists ? searchQuery : "full course tutorial",
          5
        )
      : Promise.resolve([]),
    searchChannelVideos(channelId, searchQuery, 5),
  ]);

  return { channelUrl, playlists, videos, channelId };
}

/** @deprecated use buildYouTubeContext */
export async function searchGuruYouTube(
  social: SocialLinks,
  query: string,
  maxResults = 5,
  personaId?: PersonaId
): Promise<YouTubeSearchResult> {
  const payload = await buildYouTubeContext(social, query, personaId);
  return {
    videos: payload.videos.slice(0, maxResults),
    playlists: payload.playlists,
    channelId: payload.channelId,
    channelUrl: payload.channelUrl,
    error: payload.error,
  };
}
