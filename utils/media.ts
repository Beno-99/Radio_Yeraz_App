import { MEDIA_URL } from "@/services/mobileApi";
import { Post, PostVideoSource } from "@/types/api";

const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
export const YOUTUBE_EMBED_ORIGIN = "https://www.radioyeraz.com";
export const RADIO_YERAZ_YOUTUBE_CHANNEL_URL =
  process.env.EXPO_PUBLIC_YOUTUBE_CHANNEL_URL ||
  "https://youtube.com/@radioyeraz";
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
    return new URL(encoded, MEDIA_URL).toString();
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

export function getYouTubeThumbnail(
  videoId?: string | null,
  variant: "standard" | "wide" = "standard",
): string | undefined {
  const safeId = getYouTubeVideoId(videoId);
  if (!safeId) return undefined;

  const fileName = variant === "wide" ? "mqdefault.jpg" : "hqdefault.jpg";
  return `https://img.youtube.com/vi/${safeId}/${fileName}`;
}

export function getYouTubeWatchUrl(videoId?: string | null): string | undefined {
  const safeId = getYouTubeVideoId(videoId);
  return safeId ? `https://www.youtube.com/watch?v=${safeId}` : undefined;
}

export function getYouTubeEmbedUrl(videoId?: string | null): string | undefined {
  const safeId = getYouTubeVideoId(videoId);
  return safeId
    ? `https://www.youtube.com/embed/${safeId}?playsinline=1&rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(YOUTUBE_EMBED_ORIGIN)}`
    : undefined;
}

export function getYouTubePlayerHtml(
  videoId: string,
  options: {
    startSeconds?: number;
    autoplay?: boolean;
    showFullscreenButton?: boolean;
  } = {},
) {
  const safeVideoId = getYouTubeVideoId(videoId) || videoId;
  const startSeconds = Math.max(0, Math.floor(options.startSeconds || 0));
  const autoplay = options.autoplay ? 1 : 0;
  const showFullscreenButton = options.showFullscreenButton === false ? 0 : 1;

  return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style>
      html, body, #player {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #000;
      }
      #endedCover {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: none;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        border: 0;
        background: #000;
      }
      #endedCover.visible {
        display: flex;
      }
      #endedPlay {
        position: relative;
        width: 68px;
        height: 68px;
        border-radius: 999px;
        background: rgba(233, 69, 96, 0.94);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.34);
      }
      #endedPlay::after {
        content: "";
        position: absolute;
        left: 28px;
        top: 21px;
        width: 0;
        height: 0;
        border-top: 13px solid transparent;
        border-bottom: 13px solid transparent;
        border-left: 18px solid #fff;
      }
    </style>
  </head>
  <body>
    <div id="player"></div>
    <button id="endedCover" type="button" aria-label="Replay video">
      <span id="endedPlay"></span>
    </button>
    <script>
      var player;
      var progressTimer = null;
      var endedHandled = false;
      var endedCover = document.getElementById("endedCover");

      function send(message) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        }
      }

      function sendProgress() {
        if (!player || typeof player.getCurrentTime !== "function") return;
        var seconds = player.getCurrentTime();
        var duration =
          typeof player.getDuration === "function" ? player.getDuration() : 0;
        if (
          Number.isFinite(seconds) &&
          Number.isFinite(duration) &&
          duration > 0 &&
          seconds > 0 &&
          duration - seconds <= 0.35
        ) {
          handleVideoEnded();
          return;
        }
        if (Number.isFinite(seconds)) {
          send({
            type: "youtube-progress",
            seconds: seconds,
            duration: Number.isFinite(duration) ? duration : 0
          });
        }
      }

      function setProgressTimer(active) {
        if (progressTimer) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
        if (active) {
          progressTimer = setInterval(sendProgress, 250);
        }
      }

      function showEndedCover() {
        if (endedCover) {
          endedCover.className = "visible";
        }
      }

      function hideEndedCover() {
        if (endedCover) {
          endedCover.className = "";
        }
      }

      function handleVideoEnded() {
        if (endedHandled) return;
        endedHandled = true;
        setProgressTimer(false);
        showEndedCover();
        send({ type: "youtube-ended" });
        setTimeout(resetEndedVideo, 0);
      }

      function resetEndedVideo() {
        if (!player) return;
        try {
          if (typeof player.pauseVideo === "function") {
            player.pauseVideo();
          }
          if (typeof player.seekTo === "function") {
            player.seekTo(0, true);
          }
          showEndedCover();
        } catch (error) {}
      }

      function replayVideo() {
        endedHandled = false;
        hideEndedCover();
        if (!player) return;
        try {
          if (typeof player.seekTo === "function") {
            player.seekTo(0, true);
          }
          if (typeof player.playVideo === "function") {
            player.playVideo();
          }
        } catch (error) {}
      }

      if (endedCover) {
        endedCover.addEventListener("click", replayVideo);
      }

      function onYouTubeIframeAPIReady() {
        player = new YT.Player("player", {
          width: "100%",
          height: "100%",
          videoId: "${safeVideoId}",
          host: "https://www.youtube.com",
          playerVars: {
            autoplay: ${autoplay},
            playsinline: 1,
            controls: 1,
            disablekb: 1,
            fs: ${showFullscreenButton},
            rel: 0,
            cc_load_policy: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            start: ${startSeconds},
            origin: "${YOUTUBE_EMBED_ORIGIN}"
          },
          events: {
            onReady: function() {
              sendProgress();
              if (${autoplay} === 1 && typeof player.playVideo === "function") {
                setTimeout(function() {
                  try {
                    player.playVideo();
                  } catch (error) {}
                }, 100);
              }
            },
            onError: function(event) {
              send({ type: "youtube-error", code: event.data });
            },
            onStateChange: function(event) {
              sendProgress();
              setProgressTimer(event.data === YT.PlayerState.PLAYING);
              if (event.data === YT.PlayerState.PLAYING) {
                if (!endedHandled) {
                  hideEndedCover();
                }
              }
              if (event.data === 0 || event.data === YT.PlayerState.ENDED) {
                handleVideoEnded();
              }
            }
          }
        });
      }

      var tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = function() {
        send({ type: "youtube-error", code: "script-load" });
      };
      document.body.appendChild(tag);
    </script>
  </body>
</html>
`;
}

export function getPostMediaType(
  post?: Partial<
    Pick<
      Post,
      | "mainImage"
      | "videoSource"
      | "youtubeVideoId"
      | "youtubeUrl"
      | "facebookUrl"
    >
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
