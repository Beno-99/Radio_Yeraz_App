import PageHeader from "@/components/PageHeader";
import MarbleBackground from "@/components/MarbleBackground";
import NotificationPermissionPrompt from "@/components/NotificationPermissionPrompt";
import { NetworkContext } from "@/components/NetworkProvider";
import StreamWaveform from "@/components/StreamWaveform";
import { extractApiArray, mobileApi } from "@/services/mobileApi";
import { socketService } from "@/services/socket.service";
import { ApiPaginatedResponse, Carousel, StreamLink } from "@/types/api";
import {
  getAbsoluteMediaUrl,
  getSafeExternalUrl,
  getYouTubeThumbnail,
  getYouTubeVideoId,
  getYouTubeWatchUrl,
} from "@/utils/media";
import { Ionicons } from "@expo/vector-icons";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  LayoutChangeEvent,
  Linking,
  LogBox,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextLayoutEvent,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

LogBox.ignoreLogs(["Unable to activate keep awake"]);

const TAB_BAR_CLEARANCE = 16;
const STATUS_POPUP_DELAY_MS = 3000;
const STREAM_ERROR_CONFIRM_DELAY_MS = 12000;
const RECONNECTING_SETTLE_DELAY_MS = 2500;
const NETWORK_RETRY_DELAY_MS = 900;
const STREAM_SWITCH_PLAY_DELAY_MS = 350;
const METADATA_REFRESH_INTERVAL_MS = 15000;
const LOGO_WAVE_DURATION_MS = 4200;
const LOGO_WAVE_STAGGER_MS = 1300;
const LOGO_WAVE_RESET_MS = 600;
const MARQUEE_GAP = 64;
const MARQUEE_MIN_DURATION_MS = 3800;
const MARQUEE_MS_PER_PIXEL = 9;
const MARQUEE_START_DELAY_MS = 350;
const TITLE_MEASURE_WIDTH = 12000;
const STREAM_AUDIO_HEADERS = {
  "Icy-MetaData": "0",
};
const RADIO_ARTIST = "Radio Yeraz • Syria";
const RADIO_ALBUM = "Radio Yeraz";
const RADIO_ARTWORK_URL = "https://www.radioyeraz.com/radioLogo-300.jpg";
const fallbackImage = require("@/assets/images/sublogo.png");
const FALLBACK_STREAM_URL =
  process.env.EXPO_PUBLIC_STREAM_URL ||
  "https://streaming05.liveboxstream.uk/proxy/radioye3/stream";
const FALLBACK_METADATA_URL =
  process.env.EXPO_PUBLIC_STREAM_METADATA_URL ||
  "https://meta.radioyeraz.com/MetaData.txt";
const FALLBACK_STREAM_LINKS: StreamLink[] = [
  {
    id: "fallback-low",
    _id: "fallback-low",
    title: "Low Data",
    url: "https://streaming05.liveboxstream.uk/proxy/radioye3/32",
    metadataUrl: FALLBACK_METADATA_URL,
    description: "Slow internet",
    isActive: true,
    bitrate: 32,
    displayOrder: 1,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-standard",
    _id: "fallback-standard",
    title: "Standard",
    url: "https://streaming05.liveboxstream.uk/proxy/radioye3/64",
    metadataUrl: FALLBACK_METADATA_URL,
    description: "Normal internet",
    isActive: true,
    bitrate: 64,
    displayOrder: 2,
    createdAt: "",
    updatedAt: "",
  },
  {
    id: "fallback-main",
    _id: "fallback-main",
    title: "Main",
    url: FALLBACK_STREAM_URL,
    metadataUrl: FALLBACK_METADATA_URL,
    description: "Fast internet",
    isActive: true,
    displayOrder: 3,
    createdAt: "",
    updatedAt: "",
  },
];

type StreamOption = StreamLink & {
  label: string;
  detail: string;
};

type PlaybackIntent = "idle" | "playing" | "paused";

type RadioPlayerState =
  | "idle"
  | "loading"
  | "buffering"
  | "playing"
  | "paused"
  | "error"
  | "offline"
  | "reconnecting";

type JsonRecord = Record<string, unknown>;

const normalizeUrl = (value: string) => value.replace(/\/+$/, "");

const normalizePlaybackTitle = (title?: string | null) =>
  title?.trim() || "LIVE STREAM";

const parseBitrate = (value?: number | string | null) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;

  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const getStreamVariant = (
  url?: string | null,
  title?: string | null,
  bitrate?: number | string | null,
) => {
  const combined = `${title || ""} ${url || ""}`.toLowerCase();
  const parsedBitrate = parseBitrate(bitrate);

  if (
    parsedBitrate === 32 ||
    /\/32(?:$|[/?#])/.test(combined) ||
    combined.includes("low")
  ) {
    return { label: "Low Data", detail: "Slow internet", order: 1 };
  }

  if (
    parsedBitrate === 64 ||
    /\/64(?:$|[/?#])/.test(combined) ||
    combined.includes("standard")
  ) {
    return { label: "Standard", detail: "Normal internet", order: 2 };
  }

  if (parsedBitrate) {
    return {
      label: parsedBitrate < 64 ? "Low Data" : "High Quality",
      detail: parsedBitrate < 64 ? "Slow internet" : "Fast internet",
      order: parsedBitrate < 64 ? 1 : 3,
    };
  }

  if (combined.includes("stream") || combined.includes("main")) {
    return { label: "Main", detail: "Fast internet", order: 3 };
  }

  return { label: title?.trim() || "Live", detail: "Stream", order: 4 };
};

const buildStreamOptions = (links: StreamLink[]) => {
  const usableLinks = links
    .filter((link) => link.isActive !== false && typeof link.url === "string")
    .filter((link) => link.url.trim().startsWith("https://"));

  const sourceLinks =
    usableLinks.length > 0 ? usableLinks : FALLBACK_STREAM_LINKS;
  const uniqueByUrl = new Map<string, StreamOption>();

  sourceLinks.forEach((link, index) => {
    const url = normalizeUrl(link.url.trim());
    if (uniqueByUrl.has(url)) return;

    const variant = getStreamVariant(url, link.title, link.bitrate);
    uniqueByUrl.set(url, {
      ...link,
      id: link.id || link._id || url,
      _id: link._id || link.id || url,
      url,
      label: variant.label,
      detail: variant.detail,
      displayOrder: variant.order ?? link.displayOrder ?? index + 1,
    });
  });

  return Array.from(uniqueByUrl.values()).sort((a, b) => {
    const orderA =
      getStreamVariant(a.url, a.title, a.bitrate).order ?? a.displayOrder;
    const orderB =
      getStreamVariant(b.url, b.title, b.bitrate).order ?? b.displayOrder;
    return orderA - orderB;
  });
};

const getPreferredStreamOption = (options: StreamOption[]) => {
  return (
    options.find((option) => /\/stream$/i.test(option.url)) ||
    options.find((option) => option.label === "Main") ||
    options[0]
  );
};

const getStreamMetadataUrl = (
  option?: Pick<StreamLink, "metadataUrl" | "metaUrl"> | null,
) => option?.metadataUrl || option?.metaUrl || "";

const initialStreamOptions = buildStreamOptions([]);
const initialStreamOption = getPreferredStreamOption(initialStreamOptions);

const isLikelyAudioStreamUrl = (value?: string | null, streamUrl?: string) => {
  if (!value) return false;

  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, "");
    const streamPath = streamUrl
      ? new URL(streamUrl).pathname.replace(/\/+$/, "")
      : "";

    return (
      normalizeUrl(value) === normalizeUrl(streamUrl || "") ||
      path === streamPath ||
      /\/proxy\/[^/]+\/(stream|32|64)$/i.test(path)
    );
  } catch {
    return false;
  }
};

const isJsonRecord = (value: unknown): value is JsonRecord => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const cleanMetadataTitle = (value: unknown) => {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const title = String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = title.toLowerCase();

  if (
    !title ||
    normalized === "null" ||
    normalized === "(null)" ||
    normalized === "undefined" ||
    normalized === "cultureclub" ||
    normalized === "live aleppo-1" ||
    normalized === "live in aleppo-1" ||
    normalized === "radioyeraz stream"
  ) {
    return "";
  }

  return title;
};

const getTextMetadataTitle = (value: string) => {
  const icyTitle = value.match(/StreamTitle=(.*?)(?:;|$)/i)?.[1];
  if (icyTitle) {
    return cleanMetadataTitle(
      icyTitle
        .trim()
        .replace(/^['"]/, "")
        .replace(/['"]$/, "")
        .replace(/\\(['"])/g, "$1"),
    );
  }

  return value.split(/\r?\n/).map(cleanMetadataTitle).find(Boolean) || "";
};

const getObjectMetadataTitle = (value: unknown) => {
  if (!isJsonRecord(value)) return "";

  const directTitle = cleanMetadataTitle(
    value.title ||
      value.song ||
      value.nowPlaying ||
      value.currentSong ||
      value.streamTitle ||
      value.StreamTitle ||
      value.rawmeta,
  );

  if (directTitle) return directTitle;

  if (isJsonRecord(value.track)) {
    const artist = cleanMetadataTitle(value.track.artist);
    const trackTitle = cleanMetadataTitle(value.track.title);

    if (artist && trackTitle) return `${artist} - ${trackTitle}`;
    if (trackTitle || artist) return trackTitle || artist;
  }

  return "";
};

const getJsonMetadataTitle = (data: unknown) => {
  const directTitle = getObjectMetadataTitle(data);
  if (directTitle) return directTitle;
  if (!isJsonRecord(data)) return "";

  const source = isJsonRecord(data.icestats) ? data.icestats.source : null;
  const sources = Array.isArray(source) ? source : [source];
  const sourceTitle = sources.map(getObjectMetadataTitle).find(Boolean);
  if (sourceTitle) return sourceTitle;

  const dataItems = Array.isArray(data.data) ? data.data : [data.data];
  return dataItems.map(getObjectMetadataTitle).find(Boolean) || "";
};

const addMetadataCacheBuster = (url: string) => {
  try {
    const nextUrl = new URL(url);
    nextUrl.searchParams.set("_", String(Date.now()));
    return nextUrl.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}_=${Date.now()}`;
  }
};

const fetchMetadataTitleFromUrl = async (url: string, signal: AbortSignal) => {
  const res = await fetch(addMetadataCacheBuster(url), {
    headers: {
      Accept: "text/plain, application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
    signal,
  });

  if (!res.ok) {
    throw new Error("Metadata endpoint did not respond successfully.");
  }

  const contentType = res.headers.get("content-type") || "";
  return contentType.toLowerCase().includes("json")
    ? getJsonMetadataTitle(await res.json())
    : getTextMetadataTitle(await res.text());
};

function MarqueeTrackTitle({ title }: { title: string }) {
  const displayTitle = title || "LIVE STREAM";
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);
  const shouldAnimate =
    containerWidth > 0 && textWidth > 0;

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.ceil(event.nativeEvent.layout.width);
    setContainerWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth,
    );
  }, []);

  const onTextLayout = useCallback((event: TextLayoutEvent) => {
    const nextWidth = Math.ceil(event.nativeEvent.lines[0]?.width || 0);
    setTextWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth,
    );
  }, []);

  useEffect(() => {
    cancelAnimation(translateX);
    translateX.value = 0;

    if (!shouldAnimate) return;

    const loopDistance = textWidth + MARQUEE_GAP;
    const duration = Math.max(
      MARQUEE_MIN_DURATION_MS,
      loopDistance * MARQUEE_MS_PER_PIXEL,
    );

    translateX.value = withDelay(
      MARQUEE_START_DELAY_MS,
      withRepeat(
        withSequence(
          withTiming(-loopDistance, {
            duration,
            easing: Easing.linear,
          }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );

    return () => {
      cancelAnimation(translateX);
      translateX.value = 0;
    };
  }, [displayTitle, shouldAnimate, textWidth, translateX]);

  const marqueeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));
  const animatedTextStyle =
    shouldAnimate && textWidth > 0
      ? [styles.songTitle, { width: textWidth }]
      : styles.songTitle;
  const animatedTrackStyle =
    shouldAnimate && textWidth > 0
      ? { width: textWidth * 2 + MARQUEE_GAP }
      : undefined;

  return (
    <View style={styles.marqueeViewport} onLayout={onContainerLayout}>
      <Text
        style={[styles.songTitle, styles.marqueeMeasureText]}
        numberOfLines={1}
        ellipsizeMode="clip"
        onTextLayout={onTextLayout}
      >
        {displayTitle}
      </Text>
      <Animated.View
        style={[
          styles.marqueeTrack,
          !shouldAnimate ? styles.marqueeTrackStatic : undefined,
          animatedTrackStyle,
          shouldAnimate ? marqueeStyle : undefined,
        ]}
      >
        <Text
          style={animatedTextStyle}
          numberOfLines={1}
          ellipsizeMode="clip"
        >
          {displayTitle}
        </Text>
        {shouldAnimate ? (
          <>
            <View style={styles.marqueeSpacer} />
            <Text
              style={[styles.songTitle, styles.marqueeDuplicate, { width: textWidth }]}
              numberOfLines={1}
              ellipsizeMode="clip"
            >
              {displayTitle}
            </Text>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

// ====================== MAIN COMPONENT ======================
export default function RadioPlayer() {
  const { isOffline } = useContext(NetworkContext);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isLandscape = screenWidth > screenHeight;
  const landscapeGap = 16;
  const landscapeHorizontalPadding = 40;
  const landscapeAvailableWidth = Math.max(
    screenWidth - landscapeHorizontalPadding,
    1,
  );
  const landscapeCarouselTarget = Math.min(520, landscapeAvailableWidth * 0.54);
  const playerColumnWidth = isLandscape
    ? Math.max(
        240,
        Math.min(
          340,
          landscapeAvailableWidth - landscapeCarouselTarget - landscapeGap,
        ),
      )
    : screenWidth;
  const carouselPageWidth = isLandscape
    ? Math.max(
        240,
        Math.min(
          520,
          landscapeAvailableWidth - playerColumnWidth - landscapeGap,
        ),
      )
    : screenWidth;
  const titleBadgeWidth = isLandscape
    ? Math.min(playerColumnWidth, 320)
    : Math.max(screenWidth - 60, 1);
  const streamSelectorWidth = isLandscape
    ? Math.min(playerColumnWidth, 320)
    : Math.min(Math.max(screenWidth - 40, 1), 380);
  const carouselImageWidth = isLandscape
    ? carouselPageWidth
    : Math.max(screenWidth - 40, 1);
  const carouselImageHeight = isLandscape
    ? Math.min(190, Math.max(154, screenHeight * 0.42))
    : 146;
  const carouselScrollHeight = carouselImageHeight + (isLandscape ? 6 : 10);
  const carouselSectionHeight = carouselImageHeight + (isLandscape ? 34 : 38);
  const [STREAM_URL, setSTREAM_URL] = useState<string>(
    initialStreamOption?.url || FALLBACK_STREAM_URL,
  );
  const [metadataUrl, setMetadataUrl] = useState<string>(
    getStreamMetadataUrl(initialStreamOption) || FALLBACK_METADATA_URL,
  );
  const [streamOptions, setStreamOptions] =
    useState<StreamOption[]>(initialStreamOptions);
  const [selectedStreamId, setSelectedStreamId] = useState(
    initialStreamOption?.id || initialStreamOptions[0]?.id || "",
  );

  const [carousels, setCarousels] = useState<Carousel[]>([]);
  const [carouselsLoading, setCarouselsLoading] = useState(true);
  const [failedCarouselMediaIds, setFailedCarouselMediaIds] = useState<
    Record<string, true>
  >({});
  const [refreshing, setRefreshing] = useState(false);
  const [trackTitle, setTrackTitle] = useState("LIVE STREAM");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlayEnabled] = useState(true);
  const [playbackIntent, setPlaybackIntent] = useState<PlaybackIntent>("idle");
  const [streamLinksLoading, setStreamLinksLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [streamSwitching, setStreamSwitching] = useState(false);
  const [showDelayedStatus, setShowDelayedStatus] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const autoPlayTimerRef = useRef<number | null>(null);
  const streamErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const networkRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const statusPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const streamSwitchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const streamSwitchingRef = useRef(false);
  const wasOfflineRef = useRef(isOffline);
  const trackTitleRef = useRef(trackTitle);
  const lockScreenActiveRef = useRef(false);

  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);
  const spin = useSharedValue(0);

  const audioSource = useMemo(
    () => ({
      uri: STREAM_URL,
      headers: STREAM_AUDIO_HEADERS,
    }),
    [STREAM_URL],
  );
  const player = useAudioPlayer(audioSource);
  const status = useAudioPlayerStatus(player);
  const isPlaying = status?.playing ?? false;
  const isBuffering = status?.isBuffering ?? false;
  const selectedStreamOption = useMemo(
    () =>
      streamOptions.find((option) => option.id === selectedStreamId) ||
      getPreferredStreamOption(streamOptions),
    [selectedStreamId, streamOptions],
  );
  const mainMetadataUrl = useMemo(
    () =>
      getStreamMetadataUrl(getPreferredStreamOption(streamOptions)) ||
      FALLBACK_METADATA_URL,
    [streamOptions],
  );

  const getPlaybackMetadata = useCallback(
    (title = trackTitleRef.current) => ({
      title: normalizePlaybackTitle(title),
      artist: RADIO_ARTIST,
      albumTitle: RADIO_ALBUM,
      artworkUrl: RADIO_ARTWORK_URL,
    }),
    [],
  );

  const activatePlaybackTitle = useCallback(
    (title = trackTitleRef.current) => {
      try {
        player.setActiveForLockScreen(true, getPlaybackMetadata(title));
        lockScreenActiveRef.current = true;
      } catch (error) {
        if (__DEV__) {
          console.warn("Playback title activation failed:", error);
        }
      }
    },
    [getPlaybackMetadata, player],
  );

  const updatePlaybackTitle = useCallback(
    (title = trackTitleRef.current) => {
      if (!lockScreenActiveRef.current) return;

      try {
        player.updateLockScreenMetadata(getPlaybackMetadata(title));
      } catch (error) {
        if (__DEV__) {
          console.warn("Playback title update failed:", error);
        }
      }
    },
    [getPlaybackMetadata, player],
  );

  const clearStreamErrorTimer = useCallback(() => {
    if (streamErrorTimerRef.current) {
      clearTimeout(streamErrorTimerRef.current);
      streamErrorTimerRef.current = null;
    }
  }, []);

  const clearReconnectingTimer = useCallback(() => {
    if (reconnectingTimerRef.current) {
      clearTimeout(reconnectingTimerRef.current);
      reconnectingTimerRef.current = null;
    }
  }, []);

  const clearNetworkRetryTimer = useCallback(() => {
    if (networkRetryTimerRef.current) {
      clearTimeout(networkRetryTimerRef.current);
      networkRetryTimerRef.current = null;
    }
  }, []);

  const clearStatusPopupTimer = useCallback(() => {
    if (statusPopupTimerRef.current) {
      clearTimeout(statusPopupTimerRef.current);
      statusPopupTimerRef.current = null;
    }
  }, []);

  const clearStreamSwitchTimer = useCallback(() => {
    if (streamSwitchTimerRef.current) {
      clearTimeout(streamSwitchTimerRef.current);
      streamSwitchTimerRef.current = null;
    }
  }, []);

  const radioPlayerState = useMemo<RadioPlayerState>(() => {
    if (isOffline) return "offline";
    if (streamSwitching) return "reconnecting";
    if (streamError) return "error";
    if (isReconnecting) return "reconnecting";
    if (streamLinksLoading) return "loading";
    if (isBuffering) return "buffering";
    if (isPlaying) return "playing";
    if (playbackIntent === "playing") return "loading";
    if (playbackIntent === "paused") return "paused";
    return "idle";
  }, [
    isBuffering,
    isOffline,
    isPlaying,
    isReconnecting,
    playbackIntent,
    streamError,
    streamSwitching,
    streamLinksLoading,
  ]);

  const isLoadingRingActive =
    radioPlayerState === "loading" ||
    radioPlayerState === "buffering" ||
    radioPlayerState === "reconnecting";
  const isLogoStatusRingActive =
    isLoadingRingActive ||
    radioPlayerState === "offline" ||
    radioPlayerState === "error";

  const statusMessage = useMemo(() => {
    switch (radioPlayerState) {
      case "loading":
        return "Connecting to live stream...";
      case "buffering":
        return "Buffering live stream...";
      case "reconnecting":
        return "Reconnecting to Radio Yeraz...";
      case "offline":
        return "Internet connection is offline.";
      case "error":
        return streamError || "Stream unavailable. Please try again.";
      default:
        return "";
    }
  }, [radioPlayerState, streamError]);
  const shouldDelayStatusPopup =
    radioPlayerState === "loading" ||
    radioPlayerState === "buffering" ||
    radioPlayerState === "reconnecting";
  const shouldShowStatusPopup =
    Boolean(statusMessage) && (!shouldDelayStatusPopup || showDelayedStatus);
  const isWaveformActive =
    radioPlayerState === "playing" || isLoadingRingActive;
  const isLogoWaveActive =
    radioPlayerState !== "offline" && radioPlayerState !== "error";

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(() => {});
  }, []);

  useEffect(() => {
    trackTitleRef.current = trackTitle;
  }, [trackTitle]);

  useEffect(() => {
    lockScreenActiveRef.current = false;
  }, [player]);

  useEffect(() => {
    if (!isOffline && isPlaying) {
      updatePlaybackTitle(trackTitle);
    }
  }, [isOffline, isPlaying, trackTitle, updatePlaybackTitle]);

  useEffect(() => {
    const shouldRefreshLockTitle =
      !isOffline && (playbackIntent === "playing" || isPlaying);

    if (!shouldRefreshLockTitle) return;

    const interval = setInterval(() => {
      updatePlaybackTitle(trackTitleRef.current);
    }, METADATA_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [isOffline, isPlaying, playbackIntent, updatePlaybackTitle]);

  useEffect(() => {
    clearStatusPopupTimer();

    if (!statusMessage) {
      setShowDelayedStatus(false);
      return;
    }

    if (!shouldDelayStatusPopup) {
      setShowDelayedStatus(true);
      return;
    }

    setShowDelayedStatus(false);
    statusPopupTimerRef.current = setTimeout(() => {
      setShowDelayedStatus(true);
      statusPopupTimerRef.current = null;
    }, STATUS_POPUP_DELAY_MS);

    return clearStatusPopupTimer;
  }, [clearStatusPopupTimer, shouldDelayStatusPopup, statusMessage]);

  useEffect(() => {
    if (!selectedStreamOption) return;

    const shouldKeepLoading = streamSwitchingRef.current;
    clearStreamErrorTimer();
    setStreamError(null);
    setIsReconnecting(shouldKeepLoading);
    setSTREAM_URL(selectedStreamOption.url);
    setMetadataUrl(mainMetadataUrl);
    console.log("Using Stream URL:", selectedStreamOption.url);
    console.log("Using Metadata URL:", mainMetadataUrl);
  }, [clearStreamErrorTimer, mainMetadataUrl, selectedStreamOption]);

  // ================== FETCH STREAM LINKS ==================
  const fetchStreamLinks = useCallback(async () => {
    setStreamLinksLoading(true);
    try {
      const { data } = await mobileApi.get<StreamLink[]>(
        "/stream-links/active",
      );
      const links = extractApiArray<StreamLink>(data);

      const nextOptions = buildStreamOptions(links);
      setStreamOptions(nextOptions);
      setSelectedStreamId((currentId) => {
        const currentStillExists = nextOptions.some(
          (option) => option.id === currentId,
        );
        return currentStillExists
          ? currentId
          : getPreferredStreamOption(nextOptions)?.id || "";
      });
    } catch (error) {
      console.log(
        "Failed to fetch stream links, using fallback streams:",
        error,
      );
      const fallbackOptions = buildStreamOptions([]);
      setStreamOptions(fallbackOptions);
      setSelectedStreamId(getPreferredStreamOption(fallbackOptions)?.id || "");
    } finally {
      setStreamLinksLoading(false);
    }
  }, []);

  const fetchCarousels = useCallback(async (silent = false) => {
    try {
      if (!silent) setCarouselsLoading(true);
      const { data } = await mobileApi.get<ApiPaginatedResponse<Carousel>>(
        "/carousels/public",
        {
          params: { limit: 10 },
        },
      );
      const nextCarousels = extractApiArray<Carousel>(data).filter((item) => {
        return item.isActive && item.status === "active";
      });

      setCarousels(nextCarousels);
      setCurrentIndex((index) =>
        nextCarousels.length === 0
          ? 0
          : Math.min(index, nextCarousels.length - 1),
      );
    } catch (err) {
      console.log("Carousels fetch error:", err);
    } finally {
      setCarouselsLoading(false);
    }
  }, []);

  const refreshStreamContent = useCallback(
    (silent = true) => {
      fetchStreamLinks();
      fetchCarousels(silent);
    },
    [fetchCarousels, fetchStreamLinks],
  );

  // ================== INITIAL LOAD ==================
  useEffect(() => {
    refreshStreamContent(false);

    const appStateSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          refreshStreamContent(true);
        }
      },
    );

    const handleAdminNotification = (data: {
      type?: string;
      notificationType?: string;
      entityType?: string;
    }) => {
      const notificationType = String(
        data.type || data.notificationType || data.entityType || "",
      ).toUpperCase();

      if (notificationType.includes("CAROUSEL")) {
        fetchCarousels(true);
      }
    };

    socketService.connect();
    socketService.on("admin_notification", handleAdminNotification);

    return () => {
      appStateSub.remove();
      socketService.off("admin_notification", handleAdminNotification);
      socketService.disconnect();
    };
  }, [fetchCarousels, refreshStreamContent]);

  useFocusEffect(
    useCallback(() => {
      refreshStreamContent(true);
    }, [refreshStreamContent]),
  );

  // ================== METADATA ==================
  useEffect(() => {
    let mounted = true;
    let interval: number | null = null;
    let controller: AbortController | null = null;

    const applyTrackTitle = (title: string) => {
      const previousTitle = trackTitleRef.current;
      const nextTitle = title || trackTitleRef.current || "LIVE STREAM";
      const titleChanged = nextTitle !== previousTitle;

      if (__DEV__ && titleChanged) {
        console.log("Now playing:", nextTitle);
      }

      trackTitleRef.current = nextTitle;
      if (!mounted) return;

      setTrackTitle(nextTitle);

      if (
        !isOffline &&
        (playbackIntent === "playing" ||
          isPlaying ||
          isBuffering ||
          streamSwitching ||
          isReconnecting)
      ) {
        updatePlaybackTitle(nextTitle);
      }
    };

    const logTerminalTrackTitle = (reason: string, error?: unknown) => {
      if (!__DEV__) return;

      console.warn(
        reason,
        "trackTitle:",
        trackTitleRef.current || "LIVE STREAM",
        error || "",
      );
    };

    const getMetadataCandidates = () => {
      return [
        mainMetadataUrl,
        FALLBACK_METADATA_URL,
        metadataUrl,
        getStreamMetadataUrl(selectedStreamOption),
      ].filter(
        (url, index, urls): url is string =>
          Boolean(url) &&
          !isLikelyAudioStreamUrl(url, STREAM_URL) &&
          urls.indexOf(url) === index,
      );
    };

    const fetchNowPlaying = async () => {
      try {
        controller?.abort();
        controller = new AbortController();
        let timeout: ReturnType<typeof setTimeout> | null = setTimeout(
          () => controller?.abort(),
          8000,
        );

        try {
          const candidates = getMetadataCandidates();
          let nextTitle = "";

          for (const candidateUrl of candidates) {
            try {
              nextTitle = await fetchMetadataTitleFromUrl(
                candidateUrl,
                controller.signal,
              );
              if (nextTitle) break;
            } catch (error) {
              logTerminalTrackTitle("Metadata problem.", error);
            }
          }

          applyTrackTitle(nextTitle);
        } finally {
          if (timeout) {
            clearTimeout(timeout);
            timeout = null;
          }
        }
      } catch (error) {
        logTerminalTrackTitle("Metadata problem.", error);
        applyTrackTitle("");
      }
    };

    fetchNowPlaying();
    interval = setInterval(fetchNowPlaying, METADATA_REFRESH_INTERVAL_MS);

    return () => {
      mounted = false;
      controller?.abort();
      if (interval) clearInterval(interval);
    };
  }, [
    STREAM_URL,
    isBuffering,
    isOffline,
    isPlaying,
    isReconnecting,
    mainMetadataUrl,
    metadataUrl,
    playbackIntent,
    selectedStreamOption,
    streamSwitching,
    updatePlaybackTitle,
  ]);

  // ================== ANIMATIONS ==================
  useEffect(() => {
    const createLogoWave = () =>
      withRepeat(
        withSequence(
          withTiming(1, { duration: LOGO_WAVE_DURATION_MS }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      );

    if (isLogoWaveActive) {
      wave1.value = 0;
      wave2.value = 0;
      wave3.value = 0;
      wave1.value = createLogoWave();
      wave2.value = withDelay(
        LOGO_WAVE_STAGGER_MS,
        createLogoWave(),
      );
      wave3.value = withDelay(
        LOGO_WAVE_STAGGER_MS * 2,
        createLogoWave(),
      );
    } else {
      cancelAnimation(wave1);
      cancelAnimation(wave2);
      cancelAnimation(wave3);
      wave1.value = withTiming(0, { duration: LOGO_WAVE_RESET_MS });
      wave2.value = withTiming(0, { duration: LOGO_WAVE_RESET_MS });
      wave3.value = withTiming(0, { duration: LOGO_WAVE_RESET_MS });
    }
  }, [isLogoWaveActive, wave1, wave2, wave3]);

  useEffect(() => {
    if (isLoadingRingActive) {
      spin.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
    } else {
      cancelAnimation(spin);
      spin.value = 0;
    }
  }, [isLoadingRingActive, spin]);

  // ================== CAROUSEL ==================
  useEffect(() => {
    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);

    const items = carousels;
    if (items.length <= 1 || !autoPlayEnabled) return;

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % items.length;
        scrollRef.current?.scrollTo({
          x: nextIndex * carouselPageWidth,
          animated: true,
        });
        return nextIndex;
      });
    }, 4500);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [carousels, autoPlayEnabled, carouselPageWidth]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: currentIndex * carouselPageWidth,
      animated: false,
    });
  }, [carouselPageWidth, currentIndex]);

  // ================== SAFER CLEANUP ==================
  useEffect(() => {
    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
      }
      clearStreamErrorTimer();
      clearReconnectingTimer();
      clearNetworkRetryTimer();
      clearStatusPopupTimer();
      clearStreamSwitchTimer();
    };
  }, [
    clearNetworkRetryTimer,
    clearReconnectingTimer,
    clearStatusPopupTimer,
    clearStreamErrorTimer,
    clearStreamSwitchTimer,
  ]);

  const handleCarouselScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const newIndex = Math.round(
      event.nativeEvent.contentOffset.x / carouselPageWidth,
    );
    if (newIndex !== currentIndex) setCurrentIndex(newIndex);
  };

  const refreshMetadataTitle = useCallback(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const candidates = [
        mainMetadataUrl,
        FALLBACK_METADATA_URL,
        metadataUrl,
        getStreamMetadataUrl(selectedStreamOption),
      ].filter(
        (url, index, urls): url is string =>
          Boolean(url) &&
          !isLikelyAudioStreamUrl(url, STREAM_URL) &&
          urls.indexOf(url) === index,
      );

      for (const candidateUrl of candidates) {
        try {
          const nextTitle = await fetchMetadataTitleFromUrl(
            candidateUrl,
            controller.signal,
          );

          if (nextTitle) {
            trackTitleRef.current = nextTitle;
            setTrackTitle(nextTitle);
            updatePlaybackTitle(nextTitle);
            return;
          }
        } catch (error) {
          if (__DEV__) {
            console.warn(
              "Metadata refresh problem.",
              "trackTitle:",
              trackTitleRef.current || "LIVE STREAM",
              error,
            );
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }, [
    STREAM_URL,
    mainMetadataUrl,
    metadataUrl,
    selectedStreamOption,
    updatePlaybackTitle,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchCarousels(false),
      fetchStreamLinks(),
      refreshMetadataTitle(),
    ]);
    setRefreshing(false);
  }, [fetchCarousels, fetchStreamLinks, refreshMetadataTitle]);

  const selectStreamOption = useCallback(
    (option: StreamOption) => {
      if (option.id === selectedStreamOption?.id) return;

      const shouldAutoPlaySwitch =
        playbackIntent === "playing" ||
        isPlaying ||
        isBuffering ||
        isReconnecting ||
        Boolean(streamError);

      clearStreamSwitchTimer();
      clearStreamErrorTimer();
      clearReconnectingTimer();
      streamSwitchingRef.current = shouldAutoPlaySwitch;
      setStreamSwitching(shouldAutoPlaySwitch);
      setStreamError(null);
      setIsReconnecting(shouldAutoPlaySwitch);

      if (shouldAutoPlaySwitch) {
        setPlaybackIntent("playing");
      }

      setSelectedStreamId(option.id);
    },
    [
      clearReconnectingTimer,
      clearStreamErrorTimer,
      clearStreamSwitchTimer,
      isBuffering,
      isPlaying,
      isReconnecting,
      playbackIntent,
      selectedStreamOption?.id,
      streamError,
    ],
  );

  const startPlayback = useCallback(
    async (mode: "play" | "retry" = "play") => {
      if (isOffline) return;

      clearStreamErrorTimer();
      setPlaybackIntent("playing");
      setStreamError(null);

      if (mode === "retry") {
        setIsReconnecting(true);
        clearReconnectingTimer();
        reconnectingTimerRef.current = setTimeout(() => {
          setIsReconnecting(false);
          reconnectingTimerRef.current = null;
        }, RECONNECTING_SETTLE_DELAY_MS);
      }

      try {
        activatePlaybackTitle(trackTitle);
        player.play();
      } catch (e) {
        clearReconnectingTimer();
        if (streamSwitchingRef.current) {
          setIsReconnecting(true);
          reconnectingTimerRef.current = setTimeout(() => {
            setIsReconnecting(false);
            reconnectingTimerRef.current = null;
          }, RECONNECTING_SETTLE_DELAY_MS);
        } else {
          setIsReconnecting(false);
          setStreamError("Stream unavailable. Please try again.");
        }
        console.warn("Player action failed", e);
      }
    },
    [
      clearReconnectingTimer,
      clearStreamErrorTimer,
      activatePlaybackTitle,
      isOffline,
      player,
      trackTitle,
    ],
  );

  const retryPlayback = useCallback(() => {
    startPlayback("retry");
  }, [startPlayback]);

  useEffect(() => {
    if (!streamSwitching) return;

    const selectedUrl = selectedStreamOption?.url;
    if (!selectedUrl || STREAM_URL !== selectedUrl) return;

    clearStreamSwitchTimer();

    if (isOffline) {
      streamSwitchingRef.current = false;
      setStreamSwitching(false);
      setIsReconnecting(false);
      return;
    }

    streamSwitchTimerRef.current = setTimeout(() => {
      startPlayback("retry");
      streamSwitchingRef.current = false;
      setStreamSwitching(false);
      streamSwitchTimerRef.current = null;
    }, STREAM_SWITCH_PLAY_DELAY_MS);

    return clearStreamSwitchTimer;
  }, [
    STREAM_URL,
    clearStreamSwitchTimer,
    isOffline,
    selectedStreamOption?.url,
    startPlayback,
    streamSwitching,
  ]);

  useEffect(() => {
    clearStreamErrorTimer();

    const shouldConfirmError =
      playbackIntent === "playing" &&
      !isOffline &&
      !isPlaying &&
      !isBuffering &&
      !isReconnecting &&
      !streamSwitching &&
      !streamLinksLoading &&
      !streamError;

    if (!shouldConfirmError) return;

    streamErrorTimerRef.current = setTimeout(() => {
      setStreamError("Stream unavailable. Please try again.");
      setIsReconnecting(false);
      streamErrorTimerRef.current = null;
    }, STREAM_ERROR_CONFIRM_DELAY_MS);

    return clearStreamErrorTimer;
  }, [
    clearStreamErrorTimer,
    isBuffering,
    isOffline,
    isPlaying,
    isReconnecting,
    playbackIntent,
    streamError,
    streamSwitching,
    streamLinksLoading,
  ]);

  useEffect(() => {
    if (isPlaying || isBuffering) {
      streamSwitchingRef.current = false;
      setStreamSwitching(false);
      setStreamError(null);
      setIsReconnecting(false);
      clearStreamSwitchTimer();
      clearStreamErrorTimer();
      clearReconnectingTimer();
    }
  }, [
    clearReconnectingTimer,
    clearStreamErrorTimer,
    clearStreamSwitchTimer,
    isBuffering,
    isPlaying,
  ]);

  useEffect(() => {
    if (isOffline) {
      clearStreamErrorTimer();
      clearReconnectingTimer();
      clearStreamSwitchTimer();
      streamSwitchingRef.current = false;
      setStreamSwitching(false);
      setIsReconnecting(false);
    }
  }, [
    clearReconnectingTimer,
    clearStreamErrorTimer,
    clearStreamSwitchTimer,
    isOffline,
  ]);

  useEffect(() => {
    const wasOffline = wasOfflineRef.current;
    wasOfflineRef.current = isOffline;

    if (!wasOffline || isOffline) return;
    if (playbackIntent !== "playing" && !streamError) return;

    clearNetworkRetryTimer();
    networkRetryTimerRef.current = setTimeout(() => {
      startPlayback("retry");
      networkRetryTimerRef.current = null;
    }, NETWORK_RETRY_DELAY_MS);

    return clearNetworkRetryTimer;
  }, [
    clearNetworkRetryTimer,
    isOffline,
    playbackIntent,
    startPlayback,
    streamError,
  ]);

  const togglePlayback = () => {
    void (async () => {
      try {
        if (isPlaying) {
          clearNetworkRetryTimer();
          clearStreamErrorTimer();
          clearReconnectingTimer();
          clearStreamSwitchTimer();
          streamSwitchingRef.current = false;
          setStreamSwitching(false);
          setPlaybackIntent("paused");
          setStreamError(null);
          setIsReconnecting(false);
          player.pause();
          player.setActiveForLockScreen(false);
          lockScreenActiveRef.current = false;
        } else {
          await startPlayback("play");
        }
      } catch (e) {
        console.warn("Player action failed", e);
      }
    })();
  };

  // Animated Styles
  const animatedWave1 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + wave1.value * 0.6 }],
    opacity: 0.7 - wave1.value * 0.7,
  }));

  const animatedWave2 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + wave2.value * 0.6 }],
    opacity: 0.7 - wave2.value * 0.7,
  }));

  const animatedWave3 = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + wave3.value * 0.6 }],
    opacity: 0.7 - wave3.value * 0.7,
  }));

  const animatedSpinner = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));

  const carouselItems = carousels;

  return (
    <MarbleBackground style={styles.gradient}>
      <PageHeader />

      {shouldShowStatusPopup ? (
        <View
          pointerEvents="box-none"
          style={[
            styles.topStatusLayer,
            isLandscape && styles.topStatusLayerLandscape,
          ]}
        >
          <View
            style={[
              styles.topStatusPopup,
              { maxWidth: Math.max(screenWidth - 32, 1) },
              radioPlayerState === "error" && styles.topStatusError,
              radioPlayerState === "offline" && styles.topStatusOffline,
            ]}
          >
            <Ionicons
              name={
                radioPlayerState === "error"
                  ? "warning-outline"
                  : radioPlayerState === "offline"
                    ? "cloud-offline-outline"
                    : "sync-outline"
              }
              size={15}
              color={
                radioPlayerState === "error"
                  ? "#fecaca"
                  : radioPlayerState === "offline"
                    ? "#cbd5e1"
                    : "#ffb3c1"
              }
            />
            <Text
              style={[
                styles.topStatusText,
                { maxWidth: Math.max(screenWidth - 128, 1) },
                radioPlayerState === "error" && styles.topStatusTextError,
              ]}
              numberOfLines={1}
            >
              {statusMessage}
            </Text>
            {radioPlayerState === "error" ? (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={retryPlayback}
                style={styles.topRetryButton}
              >
                <Text style={styles.topRetryText}>Retry</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isLandscape && styles.scrollContentLandscape,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ff4d6d"
              colors={["#ff4d6d"]}
              progressBackgroundColor="#1b2746"
            />
          }
        >
          <View
            style={[styles.content, isLandscape && styles.contentLandscape]}
          >
            {/* <View style={styles.headerSection}>
              <Text style={styles.subHeader}>Հայկական երաժշտութիուն 24/7</Text>
            </View> */}

            <View
              style={[
                styles.playerColumn,
                isLandscape && styles.playerColumnLandscape,
                isLandscape && { width: playerColumnWidth },
              ]}
            >
              <View
                style={[
                  styles.logoContainer,
                  isLandscape && styles.logoContainerLandscape,
                ]}
              >
                <Animated.View
                  style={[
                    styles.wave,
                    isLandscape && styles.waveLandscape,
                    styles.wave1,
                    animatedWave1,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.wave,
                    isLandscape && styles.waveLandscape,
                    styles.wave2,
                    animatedWave2,
                  ]}
                />
                <Animated.View
                  style={[
                    styles.wave,
                    isLandscape && styles.waveLandscape,
                    styles.wave3,
                    animatedWave3,
                  ]}
                />
                {isLogoStatusRingActive && (
                  <Animated.View
                    style={[
                      styles.spinnerRing,
                      isLandscape && styles.spinnerRingLandscape,
                      animatedSpinner,
                    ]}
                  />
                )}
                <Image
                  source={require("@/assets/images/radioLogo.jpg")}
                  style={[styles.logo, isLandscape && styles.logoLandscape]}
                />
              </View>

              <View
                style={[
                  styles.nowPlayingContainer,
                  isLandscape && styles.nowPlayingContainerLandscape,
                ]}
              >
                <View
                  style={[
                    styles.titleBadge,
                    isLandscape && styles.titleBadgeLandscape,
                    { width: titleBadgeWidth, maxWidth: titleBadgeWidth },
                  ]}
                >
                  <MarqueeTrackTitle title={trackTitle} />
                </View>
                <Text
                  style={[
                    styles.artistName,
                    isLandscape && styles.artistNameLandscape,
                  ]}
                >
                  Radio Yeraz - Syria
                </Text>
              </View>

              {streamOptions.length > 1 && (
                <View
                  style={[
                    styles.streamSelector,
                    isLandscape && styles.streamSelectorLandscape,
                    {
                      width: streamSelectorWidth,
                      maxWidth: streamSelectorWidth,
                    },
                  ]}
                >
                  {streamOptions.map((option) => {
                    const isSelected = option.id === selectedStreamOption?.id;

                    return (
                      <TouchableOpacity
                        key={option.id}
                        activeOpacity={0.82}
                        style={[
                          styles.streamOption,
                          isSelected && styles.streamOptionActive,
                        ]}
                        onPress={() => selectStreamOption(option)}
                      >
                        <Text
                          style={[
                            styles.streamOptionTitle,
                            isLandscape && styles.streamOptionTitleLandscape,
                            isSelected && styles.streamOptionTitleActive,
                          ]}
                          numberOfLines={1}
                        >
                          {option.label}
                        </Text>
                        <Text
                          style={[
                            styles.streamOptionDetail,
                            isLandscape && styles.streamOptionDetailLandscape,
                            isSelected && styles.streamOptionDetailActive,
                          ]}
                          numberOfLines={1}
                        >
                          {option.detail}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View
                style={[
                  styles.controlsSection,
                  isLandscape && styles.controlsSectionLandscape,
                ]}
              >
                <StreamWaveform
                  active={isWaveformActive}
                  style={isLandscape && styles.waveformLandscape}
                />

                <TouchableOpacity
                  style={styles.playButton}
                  onPress={togglePlayback}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#e94560", "#ff6b6b"]}
                    style={[
                      styles.playButtonGradient,
                      isLandscape && styles.playButtonGradientLandscape,
                    ]}
                  >
                    <Ionicons
                      name={isPlaying ? "pause" : "play"}
                      size={isLandscape ? 26 : 32}
                      color="white"
                      style={{
                        marginLeft: isPlaying ? 0 : isLandscape ? 4 : 6,
                      }}
                    />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={[
                styles.carouselSection,
                isLandscape && styles.carouselSectionLandscape,
                {
                  width: carouselPageWidth,
                  height: carouselSectionHeight,
                },
              ]}
            >
              {carouselsLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#e94560"
                  style={{ marginTop: isLandscape ? 28 : 50 }}
                />
              ) : (
                <>
                  <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    scrollEnabled={carouselItems.length > 0}
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleCarouselScrollEnd}
                    onScrollEndDrag={handleCarouselScrollEnd}
                    decelerationRate="fast"
                    style={[
                      styles.carouselScroll,
                      {
                        width: carouselPageWidth,
                        height: carouselScrollHeight,
                      },
                    ]}
                  >
                    {carouselItems.length === 0 ? (
                      <View
                        style={[
                          styles.carouselItem,
                          {
                            width: carouselPageWidth,
                            height: carouselScrollHeight,
                          },
                        ]}
                      >
                        <Image
                          source={fallbackImage}
                          style={[
                            styles.carouselImage,
                            {
                              width: carouselImageWidth,
                              height: carouselImageHeight,
                              borderRadius: isLandscape ? 12 : 16,
                            },
                          ]}
                          resizeMode="contain"
                        />
                      </View>
                    ) : (
                      carouselItems.map((item, index) => {
                        const itemKey = item._id || item.id || String(index);
                        const videoId = getYouTubeVideoId(
                          item.youtubeVideoId,
                          item.youtubeUrl,
                        );
                        const mediaUri = videoId
                          ? getYouTubeThumbnail(videoId)
                          : getAbsoluteMediaUrl(item.image);
                        const targetUrl =
                          getSafeExternalUrl(item.targetUrl) ||
                          getYouTubeWatchUrl(videoId);
                        const hasLink = Boolean(targetUrl);
                        const isFallbackImage =
                          !mediaUri || failedCarouselMediaIds[itemKey];
                        const source = isFallbackImage
                          ? fallbackImage
                          : { uri: mediaUri };

                        return (
                          <TouchableOpacity
                            key={itemKey}
                            activeOpacity={hasLink ? 0.7 : 1}
                            onPress={() => {
                              if (targetUrl) {
                                void Linking.openURL(targetUrl);
                              }
                            }}
                            disabled={!hasLink}
                            style={[
                              styles.carouselItem,
                              {
                                width: carouselPageWidth,
                                height: carouselScrollHeight,
                              },
                            ]}
                          >
                            <Image
                              source={source}
                              style={[
                                styles.carouselImage,
                                {
                                  width: carouselImageWidth,
                                  height: carouselImageHeight,
                                  borderRadius: isLandscape ? 12 : 16,
                                },
                              ]}
                              resizeMode={isFallbackImage ? "contain" : "cover"}
                              onError={() =>
                                setFailedCarouselMediaIds((failed) => ({
                                  ...failed,
                                  [itemKey]: true,
                                }))
                              }
                            />

                            {videoId ? (
                              <View style={styles.carouselPlayBadge}>
                                <Ionicons name="play" size={20} color="#fff" />
                              </View>
                            ) : null}

                            {hasLink ? (
                              <View style={styles.linkBadge}>
                                <Ionicons
                                  name="link-outline"
                                  size={16}
                                  color="#fff"
                                />
                              </View>
                            ) : null}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>

                  {carouselItems.length > 1 ? (
                    <View
                      style={[
                        styles.paginationContainer,
                        isLandscape && styles.paginationContainerLandscape,
                      ]}
                    >
                      {carouselItems.map((_, i) => (
                        <View
                          key={i}
                          style={[
                            styles.paginationDot,
                            currentIndex === i && styles.activePaginationDot,
                          ]}
                        />
                      ))}
                    </View>
                  ) : null}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      <NotificationPermissionPrompt />
    </MarbleBackground>
  );
}

// ====================== STYLES ======================
const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  scrollContentLandscape: {
    paddingBottom: 58,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
    paddingTop: 8,
    paddingBottom: 12,
  },
  contentLandscape: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 64,
  },
  playerColumn: {
    width: "100%",
    alignItems: "center",
    gap: 4,
  },
  playerColumnLandscape: {
    flexShrink: 0,
    gap: 3,
  },
  headerSection: { alignItems: "center", marginTop: 10 },
  header: { fontSize: 32, fontWeight: "900", color: "#fff", letterSpacing: 4 },
  subHeader: {
    fontSize: 16,
    color: "#94a3b8",
    marginTop: 8,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    position: "relative",
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 0,
  },
  logoContainerLandscape: {
    width: 84,
    height: 84,
    marginTop: 0,
  },
  wave: {
    position: "absolute",
    width: 174,
    height: 174,
    borderRadius: 87,
    borderWidth: 4,
  },
  waveLandscape: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
  },
  wave1: { borderColor: "#e94560" },
  wave2: { borderColor: "#ff6b6b" },
  wave3: { borderColor: "#ff8fa3" },
  logo: {
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 3,
    borderColor: "#ffffff25",
  },
  logoLandscape: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 2,
  },
  spinnerRing: {
    position: "absolute",
    width: 182,
    height: 182,
    borderRadius: 91,
    borderWidth: 4,
    borderColor: "rgba(233, 69, 96, 0.8)",
    borderTopColor: "transparent",
  },
  spinnerRingLandscape: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
  },
  nowPlayingContainer: { alignItems: "center", marginBottom: 0 },
  nowPlayingContainerLandscape: {
    marginTop: -2,
  },
  titleBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  titleBadgeLandscape: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 13,
  },
  marqueeViewport: {
    width: "100%",
    minHeight: 24,
    justifyContent: "center",
    overflow: "hidden",
  },
  marqueeTrack: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  marqueeTrackStatic: {
    width: "100%",
    justifyContent: "center",
  },
  marqueeMeasureText: {
    position: "absolute",
    left: 0,
    top: -1000,
    width: TITLE_MEASURE_WIDTH,
    opacity: 0,
  },
  marqueeSpacer: {
    width: MARQUEE_GAP,
  },
  songTitle: {
    flexShrink: 0,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  marqueeDuplicate: {
    flexShrink: 0,
  },
  artistName: {
    fontSize: 14,
    color: "#cbd5e1",
    marginTop: 4,
  },
  artistNameLandscape: {
    fontSize: 11,
    marginTop: 2,
  },
  topStatusLayer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 104 : 92,
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  topStatusLayerLandscape: {
    top: Platform.OS === "ios" ? 78 : 66,
  },
  topStatusPopup: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(233, 69, 96, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(233, 69, 96, 0.18)",
  },
  topStatusError: {
    backgroundColor: "rgba(185, 28, 28, 0.28)",
    borderColor: "rgba(248, 113, 113, 0.28)",
  },
  topStatusOffline: {
    backgroundColor: "rgba(51, 65, 85, 0.58)",
    borderColor: "rgba(148, 163, 184, 0.24)",
  },
  topStatusText: {
    minWidth: 0,
    flexShrink: 1,
    color: "#ffe4ea",
    fontSize: 12,
    fontWeight: "700",
  },
  topStatusTextError: {
    color: "#fee2e2",
  },
  topRetryButton: {
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  topRetryText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  streamSelector: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 4,
    padding: 3,
    marginTop: 0,
    marginBottom: 0,
    borderRadius: 15,
    backgroundColor: "rgba(15, 23, 42, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  streamSelectorLandscape: {
    minHeight: 32,
    borderRadius: 13,
  },
  streamOption: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  streamOptionActive: {
    backgroundColor: "#e94560",
  },
  streamOptionTitle: {
    maxWidth: "100%",
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "900",
  },
  streamOptionTitleLandscape: {
    fontSize: 10,
  },
  streamOptionTitleActive: {
    color: "#fff",
  },
  streamOptionDetail: {
    maxWidth: "100%",
    marginTop: 1,
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "700",
  },
  streamOptionDetailLandscape: {
    fontSize: 8,
  },
  streamOptionDetailActive: {
    color: "rgba(255,255,255,0.86)",
  },
  controlsSection: { alignItems: "center", gap: 12, marginBottom: 12 },
  controlsSectionLandscape: {
    flexDirection: "row",
    gap: 10,
    marginTop: 1,
    marginBottom: 0,
  },
  waveformLandscape: {
    width: 168,
    height: 24,
  },
  playButton: {
    shadowColor: "#e94560",
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 5,
    marginTop: 0,
    marginBottom: 0,
  },
  playButtonGradient: {
    width: 55,
    height: 55,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  playButtonGradientLandscape: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  carouselSection: {
    alignItems: "center",
    marginTop: 4,
  },
  carouselSectionLandscape: {
    justifyContent: "center",
    marginTop: 0,
  },
  carouselScroll: {},
  carouselItem: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  carouselImage: {},
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: -32,
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  paginationContainerLandscape: {
    gap: 6,
    marginTop: -26,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  paginationDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  activePaginationDot: {
    width: 20,
    height: 7,
    borderRadius: 999,
    backgroundColor: "#e94560",
  },
  carouselPlayBadge: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(233, 69, 96, 0.9)",
  },
  linkBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(233, 69, 96, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
