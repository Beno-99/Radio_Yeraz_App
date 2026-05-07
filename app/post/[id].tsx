import ZoomableImage from "@/components/ZoomableImage";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Video, { VideoRef } from "react-native-video";

const { width } = Dimensions.get("window");

type Post = {
  _id: string;
  title: string;
  description: string;
  mainImage?: string;
  video?: string;
  profileName?: string;
  eventDate?: { $date?: string } | string;
  eventTime?: string;
  location?: string;
  isLive?: boolean;
  isPublished?: boolean;
  link?: string;
};

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL,
});

const buildImageUrl = (path?: string) => {
  if (!path) return "";
  return path.startsWith("http")
    ? path
    : `${process.env.EXPO_PUBLIC_IMAGE_BASE_URL}${path}`;
};

const formatDate = (value?: { $date?: string } | string) => {
  if (!value) return "";

  const raw = typeof value === "string" ? value : value.$date;

  if (!raw) return "";

  return new Date(raw).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function PostDetail() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    id?: string | string[];
    startAt?: string;
    autoplay?: string;
  }>();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const startAt = Number(params.startAt || 0);
  const shouldAutoplay = params.autoplay === "true";

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playing, setPlaying] = useState(shouldAutoplay);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(Platform.OS === "web");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(startAt * 1000);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

  const videoRef = useRef<VideoRef>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!id || id === "[id]" || id.trim() === "") {
        setError("Invalid post id");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/posts/${id}`);
        const data = response.data?.data ?? response.data;

        setPost(data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message || err?.message || "Failed to load post",
        );

        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const imageUri = buildImageUrl(post?.mainImage);
  const videoUri = buildImageUrl(post?.video);

  const toSafeMs = (value: unknown) => {
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
      return 0;

    return value;
  };

  const formatMs = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent =
    durationMillis > 0
      ? Math.min(100, Math.max(0, (positionMillis / durationMillis) * 100))
      : 0;

  const skipBy = (seconds: number) => {
    const nextMs = Math.max(
      0,
      Math.min(durationMillis, positionMillis + seconds * 1000),
    );

    videoRef.current?.seek(nextMs / 1000);

    setPositionMillis(nextMs);
  };

  const handleSeek = (e: any) => {
    if (durationMillis <= 0 || progressTrackWidth <= 0) return;

    const ratio = e.nativeEvent.locationX / progressTrackWidth;

    const nextMs = durationMillis * ratio;

    videoRef.current?.seek(nextMs / 1000);

    setPositionMillis(nextMs);
  };

  useFocusEffect(
    useCallback(() => {
      // screen is focused

      return () => {
        // screen is unfocused (BACK pressed)
        setPlaying(false);

        // HARD STOP video
        videoRef.current?.seek(0);
      };
    }, []),
  );

  useEffect(() => {
    return () => {
      setPlaying(false);
      videoRef.current?.pause?.(); // if supported
    };
  }, []);

  const renderVideo = (fullscreen = false) => (
    <View style={fullscreen ? styles.fullscreenMedia : styles.media}>
      <Video
        ref={videoRef}
        source={{ uri: videoUri }}
        style={StyleSheet.absoluteFill}
        resizeMode={fullscreen ? "contain" : "cover"}
        paused={!playing}
        muted={isMuted}
        repeat
        controls={false}
        playInBackground={false}
        playWhenInactive={false}
        ignoreSilentSwitch="ignore"
        onLoad={({ duration }) => {
          setDurationMillis(toSafeMs(duration * 1000));

          if (startAt > 0) {
            videoRef.current?.seek(startAt);
          }
        }}
        onProgress={({ currentTime }) => {
          setPositionMillis(currentTime * 1000);
        }}
      />

      {!showControls && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShowControls(true)}
        />
      )}

      {showControls && (
        <>
          <View style={styles.controlsOverlay} />

          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowControls(false)}
          />

          <View style={styles.videoTopBar}>
            <Pressable
              style={styles.iconButton}
              onPress={() => setIsMuted((p) => !p)}
            >
              <Ionicons
                name={isMuted ? "volume-mute" : "volume-high"}
                size={20}
                color="#fff"
              />
            </Pressable>

            <Pressable
              style={styles.iconButton}
              onPress={() => {
                setIsFullscreen((p) => !p);
                StatusBar.setHidden(!isFullscreen);
              }}
            >
              <Ionicons
                name={isFullscreen ? "contract" : "expand"}
                size={20}
                color="#fff"
              />
            </Pressable>
          </View>

          <View style={styles.centerControls}>
            <Pressable style={styles.smallControl} onPress={() => skipBy(-10)}>
              <Ionicons name="play-back" size={22} color="#fff" />
            </Pressable>

            <Pressable
              style={styles.bigControl}
              onPress={() => setPlaying((p) => !p)}
            >
              <Ionicons
                name={playing ? "pause" : "play"}
                size={30}
                color="#fff"
              />
            </Pressable>

            <Pressable style={styles.smallControl} onPress={() => skipBy(10)}>
              <Ionicons name="play-forward" size={22} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.bottomControls}>
            <Pressable
              style={styles.progressHit}
              onLayout={(e) =>
                setProgressTrackWidth(e.nativeEvent.layout.width)
              }
              onPress={handleSeek}
            >
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPercent}%` },
                  ]}
                />

                <View
                  style={[
                    styles.progressThumb,
                    { left: `${progressPercent}%` },
                  ]}
                />
              </View>
            </Pressable>

            <Text style={styles.timeText}>
              {formatMs(positionMillis)} / {formatMs(durationMillis)}
            </Text>
          </View>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#0a0e17", "#111827", "#0f172a"]}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => {
          const currentSeconds = Math.floor(positionMillis / 1000);

          setPlaying(false); // stop video immediately

          router.back();
        }}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e94560" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !post ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        >
          <View style={styles.headerCard}>
            <Text style={styles.profileName}>
              {post.profileName || "Radio Yeraz"}
            </Text>

            <Text style={styles.subText}>
              {post.location || "Aleppo-Syria"}
            </Text>
          </View>

          {videoUri ? (
            renderVideo(false)
          ) : imageUri ? (
            <Pressable
              onPress={() => setIsImageViewerVisible(true)}
              style={styles.media}
            >
              <Image
                source={{ uri: imageUri }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            </Pressable>
          ) : (
            <View style={styles.mediaPlaceholder} />
          )}

          <View style={styles.contentCard}>
            <Text style={styles.title}>{post.title}</Text>

            <Text style={styles.description}>{post.description}</Text>

            {post.eventDate ? (
              <View style={styles.row}>
                <Text style={styles.label}>Event date</Text>

                <Text style={styles.value}>{formatDate(post.eventDate)}</Text>
              </View>
            ) : null}

            {post.eventTime ? (
              <View style={styles.row}>
                <Text style={styles.label}>Event time</Text>

                <Text style={styles.value}>{post.eventTime}</Text>
              </View>
            ) : null}

            {post.link ? (
              <View style={styles.row}>
                <Text style={styles.label}>Link</Text>

                <Text style={styles.value} numberOfLines={1}>
                  {post.link}
                </Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <Text style={styles.label}>Status</Text>

              <Text style={styles.value}>
                {post.isLive ? "Live" : "Not Live"}
              </Text>
            </View>

            {post.isPublished ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Published</Text>
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}

      <Modal
        visible={isFullscreen}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <SafeAreaView style={styles.fullscreenContainer}>
          <Pressable
            style={styles.fullscreenClose}
            onPress={() => setIsFullscreen(false)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>

          {videoUri ? renderVideo(true) : null}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={isImageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsImageViewerVisible(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.viewerBackdrop}>
            <Pressable
              style={styles.viewerCloseButton}
              onPress={() => setIsImageViewerVisible(false)}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </Pressable>

            <ZoomableImage uri={imageUri} />
          </View>
        </GestureHandlerRootView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
    zIndex: 10,
  },

  backText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  errorText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },

  headerCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  profileName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },

  subText: {
    marginTop: 4,
    color: "#cbd5e1",
    fontSize: 13,
  },

  media: {
    marginHorizontal: 12,
    height: 240,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  fullscreenMedia: {
    flex: 1,
    backgroundColor: "#000",
  },

  mediaImage: {
    width: "100%",
    height: "100%",
  },

  mediaPlaceholder: {
    marginHorizontal: 12,
    height: 240,
    borderRadius: 18,
    backgroundColor: "#1f2937",
  },

  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  videoTopBar: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  iconButton: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: 8,
  },

  centerControls: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },

  smallControl: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  bigControl: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
  },

  bottomControls: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 16,
  },

  progressHit: {
    paddingVertical: 10,
  },

  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#ef4444",
  },

  progressThumb: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#ef4444",
    top: -4,
    marginLeft: -6,
  },

  timeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "right",
  },

  contentCard: {
    marginTop: 12,
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.96)",
  },

  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },

  description: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 14,
  },

  row: {
    flexDirection: "row",
    marginTop: 8,
    gap: 10,
  },

  label: {
    width: 90,
    fontSize: 13,
    fontWeight: "700",
    color: "#6b7280",
  },

  value: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },

  badge: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },

  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
  },

  fullscreenClose: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 20,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },

  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
    justifyContent: "center",
    alignItems: "center",
  },

  viewerCloseButton: {
    position: "absolute",
    top: 44,
    right: 20,
    zIndex: 20,
    padding: 6,
  },

  viewerImageWrap: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  viewerImage: {
    width: "100%",
    height: "80%",
  },
});
