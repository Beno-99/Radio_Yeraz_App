import PostLiveBadge from "@/components/PostLiveBadge";
import PostMediaPreview from "@/components/PostMediaPreview";
import ZoomableImage from "@/components/ZoomableImage";
import { Post } from "@/types/api";
import {
  getAbsoluteMediaUrl,
  getPostMediaType,
  getSafeExternalUrl,
} from "@/utils/media";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { memo, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const MOBILE_MEDIA_ASPECT_RATIO = 4 / 3;
const DESKTOP_MEDIA_ASPECT_RATIO = 16 / 9;

type PostCardProps = {
  item: Post;
  openMedia?: (item: Post) => void;
  isVisible?: boolean;
  isScrolling?: boolean;
  isRefreshing?: boolean;
  returnVideoTime?: number;
};

const timeAgo = (date?: string | null) => {
  if (!date) return "recent";
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (!Number.isFinite(seconds)) return "recent";
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return `${days} days ago`;
};

const cleanLocation = (location?: string | null) => {
  if (!location) return "Aleppo-Syria";
  const parts = location.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return "Aleppo-Syria";
  return parts[parts.length - 1];
};

const formatDate = (date?: string | null) => {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

function PostCard({ item, openMedia }: PostCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);

  const postId = String(item?._id || item?.id || "");
  const imageUri = useMemo(
    () => getAbsoluteMediaUrl(item?.mainImage),
    [item?.mainImage],
  );
  const mediaType = getPostMediaType(item);
  const externalUrl = getSafeExternalUrl(item?.link);
  const postedTime = timeAgo(item?.postedDate || item?.createdAt);
  const location = cleanLocation(item?.location);
  const eventDate = formatDate(item?.eventDate);

  const isCompact = screenWidth < 360;
  const isTablet = screenWidth >= 768;
  const isDesktopWeb = Platform.OS === "web" && screenWidth >= 1024;

  const cardMaxWidth = isDesktopWeb ? 680 : isTablet ? 620 : undefined;
  const avatarSize = isCompact ? 38 : isTablet ? 50 : 44;
  const headerPadding = isCompact ? 10 : isTablet ? 14 : 12;
  const contentPadding = isCompact ? 12 : isTablet ? 18 : 16;
  const titleSize = isCompact ? 16 : isTablet ? 20 : 18;
  const descriptionSize = isCompact ? 14 : 15;
  const mediaAspectRatio = isDesktopWeb
    ? DESKTOP_MEDIA_ASPECT_RATIO
    : MOBILE_MEDIA_ASPECT_RATIO;
  const mediaMaxHeight = isDesktopWeb ? 420 : screenWidth * 1.05;

  const openPostDetail = () => {
    if (!postId || postId === "[id]") return;
    router.push({
      pathname: "/post/[id]",
      params: { id: postId },
    });
  };

  const handleMediaPress = () => {
    if (mediaType === "image" && imageUri) {
      setIsImageViewerVisible(true);
      openMedia?.(item);
      return;
    }

    openPostDetail();
  };

  const openExternalLink = async () => {
    if (!externalUrl) return;
    const supported = await Linking.canOpenURL(externalUrl);
    if (supported) {
      await Linking.openURL(externalUrl);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={[
          styles.card,
          { maxWidth: cardMaxWidth },
          isCompact && styles.cardCompact,
        ]}
      >
        <View style={[styles.profileHeader, { padding: headerPadding }]}>
          <Image
            source={require("@/assets/images/radioLogo.jpg")}
            style={[
              styles.profileAvatar,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2,
              },
            ]}
          />

          <View style={styles.profileInfo}>
            <Text
              style={[styles.profileName, { fontSize: titleSize - 2 }]}
              numberOfLines={1}
            >
              {item?.profileName || "Radio Yeraz"}
            </Text>
            <View style={styles.profileMeta}>
              <Text style={styles.profileMetaText}>{postedTime}</Text>
              <Text style={styles.metaDot}> - </Text>
              <Text style={styles.profileMetaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          </View>

          <PostLiveBadge
            liveStatus={item?.liveStatus}
            isLive={item?.isLive}
            style={styles.headerBadge}
          />
        </View>

        {mediaType !== "none" ? (
          <PostMediaPreview
            post={item}
            onPress={handleMediaPress}
            style={[
              styles.mediaContainer,
              { aspectRatio: mediaAspectRatio, maxHeight: mediaMaxHeight },
            ]}
          />
        ) : null}

        <View style={[styles.cardContent, { padding: contentPadding }]}>
          <TouchableOpacity activeOpacity={0.75} onPress={openPostDetail}>
            <Text style={[styles.title, { fontSize: titleSize }]}>
              {item?.title || "No title"}
            </Text>
          </TouchableOpacity>

          <Text
            style={[styles.description, { fontSize: descriptionSize }]}
            numberOfLines={4}
          >
            {item?.description || "No description"}
          </Text>

          {externalUrl ? (
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.linkRow}
              onPress={openExternalLink}
            >
              <Ionicons name="open-outline" size={15} color="#60a5fa" />
              <Text style={styles.linkText} numberOfLines={1}>
                {externalUrl}
              </Text>
            </TouchableOpacity>
          ) : null}

          {item?.location || eventDate || item?.eventTime ? (
            <View style={styles.cardFooter}>
              {item?.location ? (
                <View style={styles.footerItem}>
                  <Ionicons name="location-outline" size={13} color="#9ca3af" />
                  <Text style={styles.footerText} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              ) : null}
              {eventDate ? (
                <View style={styles.footerItem}>
                  <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
                  <Text style={styles.footerText}>{eventDate}</Text>
                </View>
              ) : null}
              {item?.eventTime ? (
                <View style={styles.footerItem}>
                  <Ionicons name="time-outline" size={13} color="#9ca3af" />
                  <Text style={styles.footerText}>{item.eventTime}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

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
    </GestureHandlerRootView>
  );
}

export default memo(PostCard);

const styles = StyleSheet.create({
  card: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardCompact: {
    borderRadius: 14,
    marginBottom: 14,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  profileMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  profileMetaText: {
    flexShrink: 1,
    fontSize: 13,
    color: "#ffffff",
  },
  metaDot: {
    color: "#ffffff",
  },
  headerBadge: {
    marginLeft: 8,
  },
  mediaContainer: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  cardContent: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: "#d1d5db",
    lineHeight: 22,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: "#60a5fa",
    textDecorationLine: "underline",
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
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
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
    gap: 4,
  },
  footerText: {
    flexShrink: 1,
    fontSize: 12,
    color: "#9ca3af",
  },
});
