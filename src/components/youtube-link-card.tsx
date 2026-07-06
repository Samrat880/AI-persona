"use client";

import { cn } from "~/lib/utils";
import {
  getYouTubeThumbnail,
  type YouTubeSource,
  type YouTubeSourceType,
} from "~/lib/youtube-sources";
import { ExternalLink, ListVideo, Play, Radio } from "lucide-react";

const TYPE_LABELS: Record<YouTubeSourceType, string> = {
  video: "Video",
  playlist: "Playlist",
  channel: "Channel",
};

function TypeIcon({ type }: { type: YouTubeSourceType }) {
  if (type === "playlist") {
    return <ListVideo className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  }
  if (type === "channel") {
    return <Radio className="h-3.5 w-3.5 shrink-0" aria-hidden />;
  }
  return <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />;
}

export function YouTubeLinkCard({
  url,
  title,
  thumbnail,
  type = "video",
  channelName,
  compact = false,
  className,
}: {
  url: string;
  title: string;
  thumbnail?: string;
  type?: YouTubeSourceType;
  channelName?: string;
  compact?: boolean;
  className?: string;
}) {
  const imageUrl = getYouTubeThumbnail(url, thumbnail);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex overflow-hidden rounded-lg border border-border/50 bg-black/[0.03] dark:bg-white/[0.04]",
        "transition-colors hover:border-primary/40 hover:bg-primary/5",
        compact ? "my-1.5" : "my-2",
        className
      )}
    >
      <div
        className={cn(
          "relative shrink-0 overflow-hidden bg-muted",
          compact ? "h-14 w-24" : "h-[4.5rem] w-28 sm:h-20 sm:w-32"
        )}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-red-600/90 text-white">
            <Play className="h-6 w-6" aria-hidden />
          </div>
        )}
        {type === "video" && imageUrl && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white">
              <Play className="h-4 w-4 fill-current" aria-hidden />
            </span>
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3 py-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground group-hover:text-primary">
          {title}
        </p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <TypeIcon type={type} />
            {TYPE_LABELS[type]}
          </span>
          {channelName && (
            <>
              <span aria-hidden>·</span>
              <span className="truncate">{channelName}</span>
            </>
          )}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-0.5">
            youtube.com
            <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
          </span>
        </div>
      </div>
    </a>
  );
}

export function YouTubeSourcesBlock({
  sources,
  className,
}: {
  sources: YouTubeSource[];
  className?: string;
}) {
  if (!sources.length) return null;

  return (
    <div
      className={cn(
        "mt-4 border-t border-border/40 pt-3",
        className
      )}
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Sources
      </p>
      <div className="flex flex-col gap-1">
        {sources.map((source) => (
          <YouTubeLinkCard
            key={source.url}
            url={source.url}
            title={source.title}
            thumbnail={source.thumbnail}
            type={source.type}
            channelName={source.channelName}
            compact
          />
        ))}
      </div>
    </div>
  );
}
