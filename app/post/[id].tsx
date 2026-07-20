import PostLiveBadge from "@/components/PostLiveBadge";
import MarbleBackground from "@/components/MarbleBackground";
import YouTubePlayer from "@/components/YouTubePlayer";
import ZoomableImage from "@/components/ZoomableImage";
import {
  MobileApiError,
  extractApiItem,
  getApiErrorMessage,
  isCancelledApiError,
  mobileApi,
} from "@/services/mobileApi";
import {
  getPostFavoriteId,
  useFavoritePostsStore,
} from "@/stores/favoritePostsStore";
import { useVideoProgress } from "@/stores/videoProgressStore";
import { ApiItemResponse, Post } from "@/types/api";
import {
  FEED_IMAGE_FALLBACK_ASPECT_RATIO,
  getFeedImageAspectRatio,
} from "@/utils/feedImageSizing";
import {
  getAbsoluteMediaUrl,
  getPostMediaType,
  getSafeExternalUrl,
  getYouTubeVideoId,
} from "@/utils/media";
import { formatPostLinkLabel, getSafePostLinks } from "@/utils/postLinks";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type InfoRowProps = {
  label: string;
  value?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

function InfoRow({ label, value, icon, onPress }: InfoRowProps) {
  if (!value) return null;

  const content = (
    <>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={15} color="#e94560" />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value} numberOfLines={onPress ? 1 : undefined}>
          {value}
        </Text>
      </View>
      {onPress ? (
        <Ionicons name="open-outline" size={16} color="#94a3b8" />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.76}
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

function ExternalLinkRow({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.76}
      onPress={onPress}
    >
      <View style={styles.rowIcon}>
        <Ionicons name="link-outline" size={15} color="#e94560" />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.value, styles.linkValue]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <Ionicons name="open-outline" size={16} color="#94a3b8" />
    </TouchableOpacity>
  );
}

const UNAVAILABLE_FAVORITE_MESSAGE =
  "This post is no longer available. It may have been removed by Radio Yeraz.";

export default function PostDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id?: string | string[];
    startTime?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const routePostId = id && id !== "[id]" ? id : "";
  const routeStartTime = Array.isArray(params.startTime)
    ? params.startTime[0]
    : params.startTime;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState(
    FEED_IMAGE_FALLBACK_ASPECT_RATIO,
  );
  const [youtubeEmbedFailed, setYoutubeEmbedFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const currentPostId = getPostFavoriteId(post) || routePostId;
  const favoriteEntry = useFavoritePostsStore((state) =>
    currentPostId ? state.favorites[currentPostId] : undefined,
  );
  const toggleFavorite = useFavoritePostsStore((state) => state.toggleFavorite);
  const removeFavorite = useFavoritePostsStore((state) => state.removeFavorite);
  const syncPosts = useFavoritePostsStore((state) => state.syncPosts);
  const markUnavailable = useFavoritePostsStore(
    (state) => state.markUnavailable,
  );
  const isFavorite = Boolean(favoriteEntry);
  const isUnavailableFavorite = Boolean(favoriteEntry?.unavailableAt);

  const fetchPost = useCallback(async () => {
    if (!routePostId || routePostId.trim() === "") {
      setError("Invalid post id");
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(null);

      const response = await mobileApi.get<ApiItemResponse<Post>>(
        `/posts/${routePostId}`,
        {
          signal: controller.signal,
        },
      );

      if (!controller.signal.aborted) {
        const fetchedPost = extractApiItem<Post>(response.data, ["post"]);
        setPost(fetchedPost);

        if (fetchedPost) {
          syncPosts([fetchedPost]);
        } else {
          markUnavailable(routePostId);
        }
      }
    } catch (err) {
      if (!isCancelledApiError(err)) {
        if (err instanceof MobileApiError && err.status === 404) {
          markUnavailable(routePostId);
          setError(UNAVAILABLE_FAVORITE_MESSAGE);
        } else {
          setError(getApiErrorMessage(err));
        }
        setPost(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [markUnavailable, routePostId, syncPosts]);

  useEffect(() => {
    fetchPost();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchPost]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (router.canGoBack()) return false;

          router.replace("/(tabs)/posts");
          return true;
        },
      );

      return () => subscription.remove();
    }, [router]),
  );

  const mediaType = getPostMediaType(post);
  const imageUri = useMemo(
    () => getAbsoluteMediaUrl(post?.mainImage),
    [post?.mainImage],
  );
  const youtubeVideoId = getYouTubeVideoId(
    post?.youtubeVideoId,
    post?.youtubeUrl,
  );
  const youtubeStartTime = useMemo(() => {
    const routeSeconds = Number(routeStartTime || 0);
    if (Number.isFinite(routeSeconds) && routeSeconds > 0) {
      return routeSeconds;
    }

    return routePostId ? useVideoProgress.getState().getProgress(routePostId) : 0;
  }, [routePostId, routeStartTime]);
  const facebookUrl = getSafeExternalUrl(post?.facebookUrl);
  const externalLinks = useMemo(() => getSafePostLinks(post?.link), [post?.link]);
  const eventDate = formatDate(post?.eventDate);

  useEffect(() => {
    setImageFailed(false);
    setImageAspectRatio(FEED_IMAGE_FALLBACK_ASPECT_RATIO);

    if (mediaType !== "image" || !imageUri) return;

    let isMounted = true;

    Image.getSize(
      imageUri,
      (width, height) => {
        if (isMounted) {
          setImageAspectRatio(getFeedImageAspectRatio(width, height));
        }
      },
      () => undefined,
    );

    return () => {
      isMounted = false;
    };
  }, [imageUri, mediaType]);

  useEffect(() => {
    setYoutubeEmbedFailed(false);
  }, [youtubeVideoId]);

  const openUrl = async (url?: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      if (__DEV__) {
        console.warn("Unable to open external link:", error);
      }
    }
  };

  const renderMedia = () => {
    if (mediaType === "youtube") {
      if (!youtubeVideoId) {
        return (
          <View style={[styles.mediaPlaceholder, styles.youtubeMedia]}>
            <Ionicons name="logo-youtube" size={42} color="#e94560" />
            <Text style={styles.placeholderText}>Video unavailable</Text>
          </View>
        );
      }

      if (youtubeEmbedFailed) {
        return (
          <View style={[styles.mediaPlaceholder, styles.youtubeMedia]}>
            <Ionicons name="videocam-off-outline" size={42} color="#e94560" />
            <Text style={styles.placeholderText}>Video unavailable</Text>
          </View>
        );
      }

      return (
        <View style={[styles.media, styles.youtubeMedia]}>
          <YouTubePlayer
            videoId={youtubeVideoId}
            startTime={youtubeStartTime}
            autoplay
            onError={() => setYoutubeEmbedFailed(true)}
            onEnded={() => {
              if (routePostId) {
                useVideoProgress.getState().clearProgress(routePostId);
              }
            }}
            onProgress={(seconds) => {
              if (routePostId) {
                useVideoProgress.getState().setProgress(routePostId, seconds);
              }
            }}
          />
        </View>
      );
    }

    if (mediaType === "facebook") {
      return (
        <View style={styles.mediaPlaceholder}>
          <Ionicons name="logo-facebook" size={42} color="#93c5fd" />
          <Text style={styles.placeholderText}>Facebook Video</Text>
          {facebookUrl ? (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.mediaButton}
              onPress={() => openUrl(facebookUrl)}
            >
              <Text style={styles.mediaButtonText}>Watch on Facebook</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }

    if (mediaType === "image" && imageUri && !imageFailed) {
      return (
        <Pressable
          onPress={() => setIsImageViewerVisible(true)}
          style={[
            styles.media,
            styles.imageMedia,
            { aspectRatio: imageAspectRatio },
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.mediaImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        </Pressable>
      );
    }

    return (
      <View style={styles.mediaPlaceholder}>
        <Ionicons name="image-outline" size={42} color="#94a3b8" />
        <Text style={styles.placeholderText}>Media unavailable</Text>
      </View>
    );
  };

  const handleFavoritePress = () => {
    if (!post) return;
    toggleFavorite(post);
  };

  const handleRemoveFavorite = () => {
    removeFavorite(currentPostId);
  };

  const handleBackPress = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)/posts");
  }, [router]);

  return (
    <View style={styles.container}>
      <MarbleBackground style={StyleSheet.absoluteFill} />

      <View
        style={[
          styles.topBar,
          { paddingTop: Math.max(insets.top + 10, 18) },
        ]}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.navButton}
          activeOpacity={0.78}
          onPress={handleBackPress}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>

        {post ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? "Remove from favorites" : "Add to favorites"
            }
            style={[
              styles.navButton,
              styles.favoriteNavButton,
              isFavorite && styles.favoriteNavButtonActive,
            ]}
            activeOpacity={0.78}
            onPress={handleFavoritePress}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={22}
              color={isFavorite ? "#fff" : "#fda4af"}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.navButtonPlaceholder} />
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#e94560" />
          <Text style={styles.loadingText}>Loading post...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <View style={styles.stateIcon}>
            <Ionicons
              name={isUnavailableFavorite ? "heart-dislike-outline" : "warning-outline"}
              size={28}
              color="#fda4af"
            />
          </View>
          <Text style={styles.errorTitle}>
            {isUnavailableFavorite ? "Saved post unavailable" : "Unable to load post"}
          </Text>
          <Text style={styles.errorText}>
            {isUnavailableFavorite ? UNAVAILABLE_FAVORITE_MESSAGE : error}
          </Text>
          {isUnavailableFavorite ? (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.removeButton}
              onPress={handleRemoveFavorite}
            >
              <Text style={styles.removeButtonText}>Remove from Favorites</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.retryButton}
              onPress={fetchPost}
            >
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : !post ? (
        <View style={styles.centered}>
          <View style={styles.stateIcon}>
            <Ionicons name="document-outline" size={28} color="#fda4af" />
          </View>
          <Text style={styles.errorTitle}>
            {isUnavailableFavorite ? "Saved post unavailable" : "Post not found"}
          </Text>
          <Text style={styles.errorText}>
            {isUnavailableFavorite
              ? UNAVAILABLE_FAVORITE_MESSAGE
              : "We could not find this post right now."}
          </Text>
          {isUnavailableFavorite ? (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.removeButton}
              onPress={handleRemoveFavorite}
            >
              <Text style={styles.removeButtonText}>Remove from Favorites</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom + 30, 42) },
          ]}
        >
          <View style={styles.headerCard}>
            <View style={styles.headerText}>
              <Text style={styles.profileName}>
                {post.profileName || "Radio Yeraz"}
              </Text>
              <Text style={styles.subText}>{post.location || "Aleppo-Syria"}</Text>
            </View>
            <PostLiveBadge
              liveStatus={post.liveStatus}
              isLive={post.isLive}
              style={styles.liveBadge}
            />
          </View>

          {renderMedia()}

          <View style={styles.contentCard}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{post.title || "No title"}</Text>
              {isFavorite ? (
                <View style={styles.savedPill}>
                  <Ionicons name="heart" size={13} color="#fecdd3" />
                  <Text style={styles.savedPillText}>Saved</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.description}>
              {post.description || "No description"}
            </Text>

            <InfoRow
              label="Event date"
              value={eventDate}
              icon="calendar-outline"
            />
            <InfoRow
              label="Event time"
              value={post.eventTime}
              icon="time-outline"
            />
            <InfoRow
              label="Location"
              value={post.location}
              icon="location-outline"
            />
            {externalLinks.map((link, index) => (
              <ExternalLinkRow
                key={`${link}-${index}`}
                value={formatPostLinkLabel(link)}
                onPress={() => openUrl(link)}
              />
            ))}
          </View>
        </ScrollView>
      )}

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

            {imageUri ? <ZoomableImage uri={imageUri} /> : null}
          </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    zIndex: 10,
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8,13,26,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  favoriteNavButton: {
    backgroundColor: "rgba(233,69,96,0.16)",
    borderColor: "rgba(253,164,175,0.3)",
  },
  favoriteNavButtonActive: {
    backgroundColor: "#e94560",
    borderColor: "#fb7185",
  },
  navButtonPlaceholder: {
    width: 42,
    height: 42,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  stateIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    backgroundColor: "rgba(233,69,96,0.14)",
    borderWidth: 1,
    borderColor: "rgba(253,164,175,0.24)",
  },
  errorTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#cbd5e1",
    textAlign: "center",
    lineHeight: 23,
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 18,
    backgroundColor: "#e94560",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  removeButton: {
    marginTop: 18,
    backgroundColor: "rgba(233,69,96,0.18)",
    borderWidth: 1,
    borderColor: "rgba(253,164,175,0.34)",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
  },
  removeButtonText: {
    color: "#fecdd3",
    fontSize: 14,
    fontWeight: "800",
  },
  scrollContent: {
    paddingTop: 2,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerText: {
    flex: 1,
    minWidth: 0,
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
  liveBadge: {
    marginLeft: 10,
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
  imageMedia: {
    height: undefined,
  },
  youtubeMedia: {
    height: undefined,
    aspectRatio: 16 / 9,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
  },
  mediaPlaceholder: {
    marginHorizontal: 12,
    height: 240,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#111827",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  placeholderText: {
    color: "#dbeafe",
    fontSize: 15,
    fontWeight: "800",
  },
  mediaButton: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  mediaButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  contentCard: {
    marginTop: 12,
    marginHorizontal: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(8,13,26,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  savedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(233,69,96,0.16)",
    borderWidth: 1,
    borderColor: "rgba(253,164,175,0.26)",
  },
  savedPillText: {
    color: "#fecdd3",
    fontSize: 12,
    fontWeight: "800",
  },
  description: {
    fontSize: 16,
    color: "#cbd5e1",
    lineHeight: 24,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  rowIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233, 69, 96, 0.1)",
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94a3b8",
  },
  value: {
    marginTop: 2,
    fontSize: 14,
    color: "#f8fafc",
  },
  linkValue: {
    color: "#93c5fd",
    textDecorationLine: "underline",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "#000",
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
