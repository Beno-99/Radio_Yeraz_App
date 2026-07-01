import { API_ORIGIN } from "@/services/mobileApi";
import { Post, PostVideoSource } from "@/types/api";

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const SAFE_EXTERNAL_PROTOCOLS = new Set(["https:"]);

const getTrimmed = (value?: string | null) =>
  typeof value === "string" ? value.trim() : "";

const encodePath = (path: string) =>
  path
    .split("/")
    .map((segment, index) => {
      if (index === 0) return "";
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");

export function getSafeExternalUrl(value?: string | null): string | undefined {
  const raw = getTrimmed(value);
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    return SAFE_EXTERNAL_PROTOCOLS.has(url.protocol) ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function getAbsoluteMediaUrl(value?: string | null): string | undefined {
  const raw = getTrimmed(value);
  if (!raw) return undefined;

  try {
    const absolute = new URL(raw);
    return absolute.protocol === "https:" ? absolute.toString() : undefined;
  } catch {
    const withoutApiPrefix = raw.replace(/^\/?api\/uploads\//, "/uploads/");
    const normalized = withoutApiPrefix.startsWith("/")
      ? withoutApiPrefix
      : `/${withoutApiPrefix}`;
    const encoded = encodePath(normalized);
    return new URL(encoded, API_ORIGIN).toString();
  }
}

export function getYouTubeVideoIdFromUrl(value?: string | null): string | undefined {
  const raw = getTrimmed(value);
  if (!raw) return undefined;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const segments = parsed.pathname.split("/").filter(Boolean);
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = segments[0] ?? null;
    } else if (parsed.pathname === "/watch") {
      videoId = parsed.searchParams.get("v");
    } else if (["shorts", "embed", "live"].includes(segments[0] || "")) {
      videoId = segments[1] ?? null;
    }

    return videoId && YOUTUBE_ID_PATTERN.test(videoId) ? videoId : undefined;
  } catch {
    return undefined;
  }
}

export function getYouTubeVideoId(
  videoId?: string | null,
  youtubeUrl?: string | null,
): string | undefined {
  const direct = getTrimmed(videoId);
  if (YOUTUBE_ID_PATTERN.test(direct)) return direct;
  return getYouTubeVideoIdFromUrl(youtubeUrl);
}

export function getYouTubeThumbnail(videoId?: string | null): string | undefined {
  const safeId = getYouTubeVideoId(videoId);
  return safeId ? `https://img.youtube.com/vi/${safeId}/hqdefault.jpg` : undefined;
}

export function getYouTubeWatchUrl(videoId?: string | null): string | undefined {
  const safeId = getYouTubeVideoId(videoId);
  return safeId ? `https://www.youtube.com/watch?v=${safeId}` : undefined;
}

export function getYouTubeEmbedUrl(videoId?: string | null): string | undefined {
  const safeId = getYouTubeVideoId(videoId);
  return safeId
    ? `https://www.youtube-nocookie.com/embed/${safeId}?playsinline=1&rel=0`
    : undefined;
}

export function getPostMediaType(
  post?: Pick<
    Post,
    "mainImage" | "videoSource" | "youtubeVideoId" | "youtubeUrl" | "facebookUrl"
  > | null,
): "image" | "youtube" | "facebook" | "none" {
  if (!post) return "none";
  const source = post.videoSource;

  if (
    source === "YOUTUBE" ||
    getYouTubeVideoId(post.youtubeVideoId, post.youtubeUrl)
  ) {
    return "youtube";
  }

  if (source === "FACEBOOK" || getSafeExternalUrl(post.facebookUrl)) {
    return "facebook";
  }

  return getAbsoluteMediaUrl(post.mainImage) ? "image" : "none";
}

export function isKnownPostVideoSource(
  value?: string | null,
): value is PostVideoSource {
  return value === "YOUTUBE" || value === "FACEBOOK";
}
