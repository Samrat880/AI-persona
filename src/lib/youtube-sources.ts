export type YouTubeSourceType = "video" | "playlist" | "channel";

export interface YouTubeSource {
  title: string;
  url: string;
  thumbnail?: string;
  type: YouTubeSourceType;
  channelName?: string;
}

export function isYouTubeUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" || host === "m.youtube.com";
  } catch {
    return false;
  }
}

export function parseYouTubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1).split("/")[0];
      return id || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)/);
      if (embedMatch?.[1]) return embedMatch[1];
      const shortsMatch = parsed.pathname.match(/^\/shorts\/([^/]+)/);
      if (shortsMatch?.[1]) return shortsMatch[1];
    }
  } catch {
    return null;
  }
  return null;
}

export function getYouTubeThumbnail(url: string, fallback?: string): string | undefined {
  if (fallback) return fallback;
  const videoId = parseYouTubeVideoId(url);
  if (videoId) {
    return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  }
  return undefined;
}

export function mergeYouTubeSources(
  existing: YouTubeSource[],
  incoming: YouTubeSource[],
  max = 6
): YouTubeSource[] {
  const seen = new Set(existing.map((s) => s.url));
  const merged = [...existing];
  for (const source of incoming) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    merged.push(source);
    if (merged.length >= max) break;
  }
  return merged;
}

export function parseYouTubeSourcesFromCustom(
  custom: Record<string, unknown> | undefined
): YouTubeSource[] {
  if (!custom) return [];
  const raw = custom.youtube_sources;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.filter(isYouTubeSource);
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(isYouTubeSource);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function isYouTubeSource(value: unknown): value is YouTubeSource {
  if (!value || typeof value !== "object") return false;
  const source = value as YouTubeSource;
  return (
    typeof source.title === "string" &&
    typeof source.url === "string" &&
    isYouTubeUrl(source.url) &&
    (source.type === "video" ||
      source.type === "playlist" ||
      source.type === "channel")
  );
}
