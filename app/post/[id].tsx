import PostLiveBadge from "@/components/PostLiveBadge";
import ZoomableImage from "@/components/ZoomableImage";
import {
  getApiErrorMessage,
  isCancelledApiError,
  mobileApi,
} from "@/services/mobileApi";
import { ApiItemResponse, Post } from "@/types/api";
import {
  getAbsoluteMediaUrl,
  getPostMediaType,
  getSafeExternalUrl,
  getYouTubeEmbedUrl,
  getYouTubeVideoId,
  getYouTubeWatchUrl,
} from "@/utils/media";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { WebView } from "react-native-webview";

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
      {onPress ? <Ionicons name="open-outline" size={16} color="#64748b" /> : null}
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

export default function PostDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [mediaEnabled, setMediaEnabled] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useFocusEffect(
    useCallback(() => {
      setMediaEnabled(true);
      return () => setMediaEnabled(false);
    }, []),
  );

  const fetchPost = useCallback(async () => {
    if (!id || id === "[id]" || id.trim() === "") {
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

      const response = await mobileApi.get<ApiItemResponse<Post>>(`/posts/${id}`, {
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setPost(response.data?.data ?? null);
      }
    } catch (err) {
      if (!isCancelledApiError(err)) {
        setError(getApiErrorMessage(err));
        setPost(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }

  }, [id]);

  useEffect(() => {
    fetchPost();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchPost]);

  const mediaType = getPostMediaType(post);
  const imageUri = useMemo(
    () => getAbsoluteMediaUrl(post?.mainImage),
    [post?.mainImage],
  );
  const youtubeVideoId = getYouTubeVideoId(
    post?.youtubeVideoId,
    post?.youtubeUrl,
  );
  const youtubeEmbedUrl = getYouTubeEmbedUrl(youtubeVideoId);
  const youtubeWatchUrl = getYouTubeWatchUrl(youtubeVideoId);
  const facebookUrl = getSafeExternalUrl(post?.facebookUrl);
  const externalUrl = getSafeExternalUrl(post?.link);
  const eventDate = formatDate(post?.eventDate);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  const openUrl = async (url?: string) => {
    if (!url) return;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  const renderMedia = () => {
    if (mediaType === "youtube") {
      if (!youtubeEmbedUrl) {
        return (
          <View style={styles.mediaPlaceholder}>
            <Ionicons name="logo-youtube" size={42} color="#e94560" />
            <Text style={styles.placeholderText}>Video unavailable</Text>
          </View>
        );
      }

      return (
        <View style={styles.media}>
          {mediaEnabled ? (
            <WebView
              source={{ uri: youtubeEmbedUrl }}
              style={styles.webView}
              allowsFullscreenVideo
              mediaPlaybackRequiresUserAction
              javaScriptEnabled
              domStorageEnabled
            />
          ) : null}
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
          style={styles.media}
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

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#0a0e17", "#111827", "#0f172a"]}
        style={StyleSheet.absoluteFill}
      />

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.retryButton}
            onPress={fetchPost}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : !post ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Post not found</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
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

          {mediaType === "youtube" && youtubeWatchUrl ? (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.watchButton}
              onPress={() => openUrl(youtubeWatchUrl)}
            >
              <Ionicons name="logo-youtube" size={18} color="#fff" />
              <Text style={styles.watchButtonText}>Open on YouTube</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.contentCard}>
            <Text style={styles.title}>{post.title || "No title"}</Text>
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
            <InfoRow
              label="Link"
              value={externalUrl}
              icon="link-outline"
              onPress={externalUrl ? () => openUrl(externalUrl) : undefined}
            />
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
  scrollContent: {
    paddingBottom: 30,
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
  webView: {
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
  watchButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    marginHorizontal: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#e94560",
  },
  watchButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
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
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: "rgba(15, 23, 42, 0.08)",
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
    color: "#6b7280",
  },
  value: {
    marginTop: 2,
    fontSize: 14,
    color: "#111827",
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
