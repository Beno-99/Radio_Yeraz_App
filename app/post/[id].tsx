import ZoomableImage from "@/components/ZoomableImage";
import { useVideoProgress } from "@/stores/videoProgressStore";
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
import Video, {
  OnLoadData,
  OnProgressData,
  VideoRef,
} from "react-native-video";

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

const toSafeMs = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return 0;
  return value;
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

  const { getProgress, setProgress } = useVideoProgress();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [playing, setPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isMuted, setIsMuted] = useState(Platform.OS === "web");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);
  const [bufferedMillis, setBufferedMillis] = useState(0);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);

  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  const videoRef = useRef<VideoRef>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const loadTimeoutRef = useRef<number | null>(null);

  const fullscreenVideoRef = useRef<VideoRef>(null);

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

  useEffect(() => {
    if (post?.video && videoLoading) {
      loadTimeoutRef.current = setTimeout(() => {
        if (videoLoading) {
          setVideoLoading(false);
          setVideoError(true);
        }
      }, 15000);

      return () => {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
        }
      };
    }
  }, [post?.video, videoLoading]);

  const imageUri = buildImageUrl(post?.mainImage);
  const videoUri = buildImageUrl(post?.video);

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

  const bufferedPercent =
    durationMillis > 0
      ? Math.min(100, Math.max(0, (bufferedMillis / durationMillis) * 100))
      : 0;

  const scheduleHideControls = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    controlsTimeoutRef.current = setTimeout(() => {
      if (playing && !isBuffering) {
        setShowControls(false);
      }
    }, 3000);
  };

  const toggleVideo = () => {
    if (!videoReady) return;

    setPlaying((prev) => {
      const next = !prev;

      if (next) {
        scheduleHideControls();
      } else {
        setShowControls(true);

        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      }

      return next;
    });
  };

  const skipBy = (seconds: number) => {
    if (!videoReady || durationMillis <= 0) return;

    const nextMs = Math.max(
      0,
      Math.min(durationMillis, positionMillis + seconds * 1000),
    );

    videoRef.current?.seek(nextMs / 1000);

    setPositionMillis(nextMs);

    setShowControls(true);
    scheduleHideControls();
  };

  const handleSeek = (e: any) => {
    if (!videoReady || durationMillis <= 0 || progressTrackWidth <= 0) return;

    const ratio = e.nativeEvent.locationX / progressTrackWidth;
    const nextMs = durationMillis * ratio;

    videoRef.current?.seek(nextMs / 1000);

    setPositionMillis(nextMs);

    setShowControls(true);
    scheduleHideControls();
  };

  const handleVideoTap = () => {
    if (!videoReady) return;

    if (showControls) {
      if (playing && !isBuffering) {
        setShowControls(false);
      }
    } else {
      setShowControls(true);
      scheduleHideControls();
    }
  };

  const toggleFullscreen = () => {
    if (!videoReady) return;

    const newState = !isFullscreen;

    setIsFullscreen(newState);

    StatusBar.setHidden(newState);

    setShowControls(true);

    scheduleHideControls();
  };

  const handleVideoLoad = (data: OnLoadData) => {
    const duration = toSafeMs(data.duration * 1000);

    setDurationMillis(duration);

    setVideoLoading(false);
    setVideoReady(true);
    const savedProgress = id ? getProgress(id) : 0;
    const initialPosition = startAt > 0 ? startAt : savedProgress;

    if (initialPosition > 0) {
      setTimeout(() => {
        videoRef.current?.seek(initialPosition);
        setPositionMillis(initialPosition * 1000);
      }, 300);
    }

    if (shouldAutoplay || initialPosition > 0) {
      setPlaying(true);
      scheduleHideControls();
    }

    if (shouldAutoplay || startAt > 0) {
      setPlaying(true);
    }
    setVideoError(false);

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
  };

  const handleVideoProgress = (data: OnProgressData) => {
    const current = toSafeMs(data.currentTime * 1000);

    setPositionMillis(current);

    if (id) {
      setProgress(id, Math.floor(current / 1000));
    }

    if (data.playableDuration) {
      setBufferedMillis(toSafeMs(data.playableDuration * 1000));
    }
    setIsBuffering(false);
  };

  const handleVideoBuffer = ({ isBuffering }: { isBuffering: boolean }) => {
    setIsBuffering(isBuffering);

    if (isBuffering) {
      setShowControls(true);
    }
  };

  const handleVideoError = (error: any) => {
    console.error("Video error:", error);

    setVideoError(true);
    setVideoLoading(false);
    setVideoReady(false);
    setPlaying(false);
  };

  const handleVideoEnd = () => {
    setPlaying(false);
    setShowControls(true);

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
  };

  const retryVideoLoad = () => {
    setVideoError(false);
    setVideoLoading(true);
    setVideoReady(false);
    setPositionMillis(0);
    setDurationMillis(0);
    setBufferedMillis(0);
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (id && positionMillis > 0) {
          setProgress(id, Math.floor(positionMillis / 1000));
        }
      };
    }, [id]),
  );

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  const renderVideo = () => (
    <View style={isFullscreen ? styles.fullscreenMedia : styles.media}>
      {videoUri && !videoError && (
        <Video
          ref={fullscreenVideoRef}
          source={{ uri: videoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          paused={!playing}
          muted={isMuted}
          repeat
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onLoad={handleVideoLoad}
          onProgress={handleVideoProgress}
          onBuffer={handleVideoBuffer}
          onError={handleVideoError}
          onEnd={handleVideoEnd}
          progressUpdateInterval={500}
        />
      )}

      {(videoLoading || isBuffering) && !videoError && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>
            {videoLoading ? "Loading video..." : "Buffering..."}
          </Text>
        </View>
      )}

      {videoError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />

          <Text style={styles.errorText}>Failed to load video</Text>

          <Pressable style={styles.retryButton} onPress={retryVideoLoad}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {videoReady && !videoError && !showControls && (
        <Pressable style={styles.videoTapLayer} onPress={handleVideoTap} />
      )}

      {!showControls && playing && !isBuffering && videoReady && (
        <View style={styles.topRightBadge}>
          <View style={styles.iconBadge}>
            <Ionicons
              name={isMuted ? "volume-mute" : "volume-high"}
              size={16}
              color="#fff"
            />
          </View>
        </View>
      )}

      {videoReady && !videoError && (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleVideoTap} />
      )}

      {showControls && videoReady && !videoError && (
        <>
          <Pressable style={styles.controlsOverlay} onPress={handleVideoTap} />

          <View style={styles.videoTopBar} pointerEvents="box-none">
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                setIsMuted((prev) => !prev);

                setShowControls(true);

                if (playing) {
                  scheduleHideControls();
                }
              }}
            >
              <Ionicons
                name={isMuted ? "volume-mute" : "volume-high"}
                size={20}
                color="#fff"
              />
            </Pressable>

            <Pressable style={styles.iconButton} onPress={toggleFullscreen}>
              <Ionicons
                name={isFullscreen ? "contract" : "expand"}
                size={20}
                color="#fff"
              />
            </Pressable>
          </View>

          <View style={styles.centerControls} pointerEvents="box-none">
            <Pressable style={styles.smallControl} onPress={() => skipBy(-10)}>
              <Ionicons name="play-back" size={22} color="#fff" />
            </Pressable>

            <Pressable
              style={styles.bigControl}
              onPress={(e) => {
                e.stopPropagation();
                toggleVideo();
              }}
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
                {/* Buffered gray line */}
                <View
                  style={[
                    styles.progressBuffered,
                    {
                      width: `${bufferedPercent}%`,
                    },
                  ]}
                />

                {/* Watched red line */}
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPercent}%`,
                    },
                  ]}
                />

                {/* Thumb */}
                <View
                  style={[
                    styles.progressThumb,
                    {
                      left: `${progressPercent}%`,
                    },
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
          if (id && positionMillis > 0) {
            setProgress(id, Math.floor(positionMillis / 1000));
          }

          setPlaying(false);

          router.back();
        }}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />

        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e94560" />

          <Text style={styles.loadingText}>Loading post...</Text>
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
          contentContainerStyle={{
            paddingBottom: 30,
          }}
        >
          <View style={styles.headerCard}>
            <Text style={styles.profileName}>
              {post.profileName || "Radio Yeraz"}
            </Text>

            <Text style={styles.subText}>
              {post.location || "Aleppo-Syria"}
            </Text>
          </View>

          {!isFullscreen && videoUri ? (
            renderVideo()
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

      {/* FULLSCREEN */}
      <Modal
        visible={isFullscreen}
        transparent={false}
        animationType="fade"
        supportedOrientations={["portrait", "landscape"]}
        onRequestClose={() => {
          setIsFullscreen(false);
          StatusBar.setHidden(false);
        }}
      >
        <SafeAreaView style={styles.fullscreenContainer}>
          <View style={{ flex: 1 }}>{renderVideo()}</View>
        </SafeAreaView>
      </Modal>

      {/* IMAGE VIEWER */}
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
  container: {
    flex: 1,
  },

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

  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 14,
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

  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 20,
  },

  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
    zIndex: 20,
  },

  retryButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },

  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  videoTapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },

  topRightBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 15,
  },

  iconBadge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: 6,
  },

  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 6,
  },

  videoTopBar: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
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
    zIndex: 10,
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
    zIndex: 10,
  },

  progressHit: {
    paddingVertical: 10,
  },

  progressTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.20)",
    overflow: "hidden",
  },

  progressBuffered: {
    position: "absolute",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.45)",
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
});
