import {
  getSafeExternalUrl,
  getYouTubePlayerHtml,
  YOUTUBE_EMBED_ORIGIN,
} from "@/utils/media";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  StatusBar,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { WebView } from "react-native-webview";

type Props = {
  videoId: string;
  startTime?: number;
  autoplay?: boolean;
  style?: StyleProp<ViewStyle>;
  onProgress?: (seconds: number) => void;
  onEnded?: () => void;
  onError?: () => void;
};

const getResumeSeconds = (value: number) =>
  Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));

const shouldOpenYoutubeOutside = (value?: string | null) => {
  const safeUrl = getSafeExternalUrl(value);
  if (!safeUrl) return false;

  try {
    const parsed = new URL(safeUrl);
    const host = parsed.hostname.replace(/^(www|m)\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();

    if (host === "youtu.be") return true;
    if (host !== "youtube.com") return false;

    return (
      path === "/" ||
      path === "/watch" ||
      path.startsWith("/shorts/") ||
      path.startsWith("/live/") ||
      path.startsWith("/@") ||
      path.startsWith("/channel/") ||
      path.startsWith("/user/")
    );
  } catch {
    return false;
  }
};

const openYoutubeOutside = async (value?: string | null) => {
  const target = getSafeExternalUrl(value);
  if (!target) return;

  try {
    await Linking.openURL(target);
  } catch {}
};

export default function YouTubePlayer({
  videoId,
  startTime = 0,
  autoplay = true,
  style,
  onProgress,
  onEnded,
  onError,
}: Props) {
  const currentSecondsRef = useRef(getResumeSeconds(startTime));
  const [fullscreenVisible, setFullscreenVisible] = useState(false);
  const [fullscreenStartTime, setFullscreenStartTime] = useState(
    currentSecondsRef.current,
  );

  const inlineHtml = useMemo(
    () =>
      getYouTubePlayerHtml(videoId, {
        autoplay,
        startSeconds: currentSecondsRef.current,
        showFullscreenButton: false,
      }),
    [autoplay, videoId],
  );

  const fullscreenHtml = useMemo(
    () =>
      getYouTubePlayerHtml(videoId, {
        autoplay: true,
        startSeconds: fullscreenStartTime,
        showFullscreenButton: false,
      }),
    [fullscreenStartTime, videoId],
  );

  const handleMessage = (value: string) => {
    try {
      const payload = JSON.parse(value) as {
        type?: string;
        seconds?: number;
      };

      if (payload.type === "youtube-error") {
        onError?.();
      }

      if (payload.type === "youtube-ended") {
        currentSecondsRef.current = 0;
        onProgress?.(0);
        onEnded?.();
      }

      if (
        payload.type === "youtube-progress" &&
        typeof payload.seconds === "number"
      ) {
        currentSecondsRef.current = payload.seconds;
        onProgress?.(payload.seconds);
      }
    } catch {
      onError?.();
    }
  };

  const openFullscreen = () => {
    setFullscreenStartTime(getResumeSeconds(currentSecondsRef.current));
    setFullscreenVisible(true);
  };

  const closeFullscreen = () => {
    setFullscreenVisible(false);
  };

  const renderWebView = (html: string) => (
    <WebView
      source={{ html, baseUrl: YOUTUBE_EMBED_ORIGIN }}
      style={styles.webView}
      androidLayerType="hardware"
      originWhitelist={["*"]}
      allowsFullscreenVideo={false}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      thirdPartyCookiesEnabled
      onShouldStartLoadWithRequest={(request) => {
        if (shouldOpenYoutubeOutside(request.url)) {
          void openYoutubeOutside(request.url);
          return false;
        }

        return true;
      }}
      onOpenWindow={(event) => {
        if (shouldOpenYoutubeOutside(event.nativeEvent.targetUrl)) {
          void openYoutubeOutside(event.nativeEvent.targetUrl);
        }
      }}
      onError={onError}
      onHttpError={(event) => {
        if (event.nativeEvent.statusCode >= 400) {
          onError?.();
        }
      }}
      onMessage={(event) => handleMessage(event.nativeEvent.data)}
    />
  );

  return (
    <View style={[styles.container, style]}>
      {fullscreenVisible ? (
        <View style={styles.inlinePlaceholder} />
      ) : (
        renderWebView(inlineHtml)
      )}

      {!fullscreenVisible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open video fullscreen"
          hitSlop={10}
          onPress={openFullscreen}
          style={styles.expandButton}
        >
          <Ionicons name="expand-outline" size={20} color="#fff" />
        </Pressable>
      ) : null}

      <Modal
        animationType="fade"
        onRequestClose={closeFullscreen}
        supportedOrientations={["portrait", "landscape"]}
        visible={fullscreenVisible}
      >
        <StatusBar hidden />
        <View style={styles.fullscreenRoot}>
          {renderWebView(fullscreenHtml)}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close fullscreen video"
            hitSlop={10}
            onPress={closeFullscreen}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  expandButton: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  fullscreenRoot: {
    flex: 1,
    backgroundColor: "#000",
  },
  inlinePlaceholder: {
    flex: 1,
    backgroundColor: "#000",
  },
  webView: {
    flex: 1,
    backgroundColor: "#000",
  },
});
