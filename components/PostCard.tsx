import ZoomableImage from "@/components/ZoomableImage";
import { IMAGE_URL } from "@/services/mobileApi";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { memo, useEffect, useRef, useState } from "react";
import {
  GestureResponderEvent,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Video, { VideoRef } from "react-native-video";

const MOBILE_MEDIA_ASPECT_RATIO = 4 / 3;
const DESKTOP_MEDIA_ASPECT_RATIO = 16 / 9;

const timeAgo = (date: string) => {
  if (!date) return "recent";
  const now = new Date();
  const past = new Date(date);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
  return `${days} days ago`;
};

const cleanLocation = (location?: string) => {
  if (!location) return "Aleppo-Syria";
  const parts = location.split(",");
  if (parts.length < 2) return location;
  return parts[parts.length - 1].trim();
};

const toSafeMs = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
    return 0;
  return value;
};

function PostCard({
  item,
  openMedia,
  isVisible = true,
  isScrolling = false,
}: any) {
  const { width: screenWidth } = useWindowDimensions();
  const videoRef = useRef<VideoRef>(null);
  // Separate ref for the fullscreen video instance
  const fullscreenVideoRef = useRef<VideoRef>(null);

  const [playing, setPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(Platform.OS === "web");
  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [fullscreenProgressTrackWidth, setFullscreenProgressTrackWidth] =
    useState(0);
  const router = useRouter();

  const hasVideo = item?.video && item.video.trim() !== "";
  const hasImage = item?.mainImage && item.mainImage.trim() !== "";

  const videoUri = hasVideo
    ? item.video.trim().startsWith("http")
      ? item.video.trim()
      : IMAGE_URL + item.video.trim()
    : "";

  const imageUri = hasImage
    ? item.mainImage.trim().startsWith("http")
      ? item.mainImage.trim()
      : IMAGE_URL + item.mainImage.trim()
    : "";

  const postedTime = timeAgo(item?.createdAt);
  const location = cleanLocation(item?.location);

  const isCompact = screenWidth < 360;
  const isTablet = screenWidth >= 768;
  const isDesktopWeb = Platform.OS === "web" && screenWidth >= 1024;

  const cardMaxWidth = isDesktopWeb ? 680 : isTablet ? 620 : undefined;
  const avatarSize = isCompact ? 38 : isTablet ? 50 : 44;
  const headerPadding = isCompact ? 10 : isTablet ? 14 : 12;
  const contentPadding = isCompact ? 12 : isTablet ? 18 : 16;
  const titleSize = isCompact ? 16 : isTablet ? 20 : 18;
  const descriptionSize = isCompact ? 14 : 15;
  const controlButtonSize = isCompact ? 40 : isTablet ? 48 : 44;
  const mainControlButtonSize = isCompact ? 54 : isTablet ? 64 : 58;

  const mediaAspectRatio = isDesktopWeb
    ? DESKTOP_MEDIA_ASPECT_RATIO
    : MOBILE_MEDIA_ASPECT_RATIO;
  const mediaMaxHeight = isDesktopWeb ? 420 : screenWidth * 1.05;

  const progressPercent =
    durationMillis > 0
      ? Math.min(100, Math.max(0, (positionMillis / durationMillis) * 100))
      : 0;

  const formatMs = (ms: number) => {
    const safeMs = toSafeMs(ms);
    const totalSeconds = Math.floor(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (isScrolling && playing) {
      setPlaying(false);
      setShowControls(true);
      if (isFullscreen) {
        setIsFullscreen(false);
        StatusBar.setHidden(false);
      }
    }
  }, [isScrolling, playing, isFullscreen]);

  const toggleVideo = () => {
    if (!hasVideo) return;
    if (playing) {
      setPlaying(false);
      setShowControls(true);
    } else {
      setPlaying(true);
      setShowControls(false);
    }
  };

  const toggleMute = () => setIsMuted((prev) => !prev);

  const openFullscreen = () => {
    // Pause the card video before switching — fullscreen video will resume
    setPlaying(false);
    setIsFullscreen(true);
    StatusBar.setHidden(true);
    setShowControls(true);
  };

  const closeFullscreen = () => {
    // Pause fullscreen video, card video will resume from saved positionMillis
    setPlaying(false);
    setIsFullscreen(false);
    StatusBar.setHidden(false);
    setShowControls(true);
    // Resume card video at the saved position
    setTimeout(() => {
      videoRef.current?.seek(positionMillis / 1000);
    }, 100);
  };

  const skipBy = (seconds: number) => {
    if (!hasVideo || durationMillis <= 0) return;
    const nextMs = Math.max(
      0,
      Math.min(durationMillis, positionMillis + seconds * 1000),
    );
    if (isFullscreen) {
      fullscreenVideoRef.current?.seek(nextMs / 1000);
    } else {
      videoRef.current?.seek(nextMs / 1000);
    }
    setPositionMillis(nextMs);
  };

  const handleSeekPress = (
    event: GestureResponderEvent,
    trackWidth: number,
  ) => {
    if (!hasVideo || durationMillis <= 0 || trackWidth <= 0) return;
    const locationX = Number(event?.nativeEvent?.locationX);
    if (!Number.isFinite(locationX)) return;
    const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
    const nextMs = durationMillis * ratio;
    if (isFullscreen) {
      fullscreenVideoRef.current?.seek(nextMs / 1000);
    } else {
      videoRef.current?.seek(nextMs / 1000);
    }
    setPositionMillis(nextMs);
  };

  const renderVideoControls = (isFS: boolean) => (
    <>
      <View style={styles.controlsOverlayBg} pointerEvents="none" />
      <Pressable
        style={styles.controlsDismissLayer}
        onPress={() => setShowControls(false)}
      />

      <View style={styles.topControls} pointerEvents="box-none">
        <Pressable style={styles.iconButton} onPress={toggleMute}>
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={20}
            color="#fff"
          />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={isFS ? closeFullscreen : openFullscreen}
        >
          <Ionicons
            name={isFS ? "contract" : "expand"}
            size={20}
            color="#fff"
          />
        </Pressable>
      </View>

      <View style={styles.centerControls} pointerEvents="box-none">
        <Pressable
          style={[
            styles.circleControlButton,
            {
              width: controlButtonSize,
              height: controlButtonSize,
              borderRadius: controlButtonSize / 2,
            },
          ]}
          onPress={() => skipBy(-10)}
        >
          <Ionicons name="play-back" size={20} color="#fff" />
        </Pressable>

        <Pressable
          style={[
            styles.mainCircleControlButton,
            {
              width: mainControlButtonSize,
              height: mainControlButtonSize,
              borderRadius: mainControlButtonSize / 2,
            },
          ]}
          onPress={toggleVideo}
        >
          <Ionicons name={playing ? "pause" : "play"} size={28} color="#fff" />
        </Pressable>

        <Pressable
          style={[
            styles.circleControlButton,
            {
              width: controlButtonSize,
              height: controlButtonSize,
              borderRadius: controlButtonSize / 2,
            },
          ]}
          onPress={() => skipBy(10)}
        >
          <Ionicons name="play-forward" size={20} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.bottomControls} pointerEvents="box-none">
        <Pressable
          style={styles.progressTrackHitArea}
          onLayout={(e) =>
            isFS
              ? setFullscreenProgressTrackWidth(e.nativeEvent.layout.width)
              : setProgressTrackWidth(e.nativeEvent.layout.width)
          }
          onPress={(e) =>
            handleSeekPress(
              e,
              isFS ? fullscreenProgressTrackWidth : progressTrackWidth,
            )
          }
        >
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />
            <View
              style={[styles.progressThumb, { left: `${progressPercent}%` }]}
            />
          </View>
        </Pressable>
        <Text style={styles.timeText}>
          {formatMs(positionMillis)} / {formatMs(durationMillis)}
        </Text>
      </View>
    </>
  );

  // ─── Card Video (always rendered, hidden when fullscreen is open) ───────────
  const cardVideoElement = (
    <Video
      ref={videoRef}
      source={{ uri: videoUri }}
      style={StyleSheet.absoluteFill}
      // FIX 1: "contain" respects 4:3 aspect ratio without cropping
      resizeMode="contain"
      paused={!playing || isFullscreen}
      muted={isMuted}
      repeat
      controls={false}
      playInBackground={false}
      playWhenInactive={false}
      ignoreSilentSwitch="ignore"
      onLoad={({ duration }) => {
        setDurationMillis(toSafeMs(duration * 1000));
      }}
      onProgress={({ currentTime }) => {
        if (!isFullscreen) {
          setPositionMillis(toSafeMs(currentTime * 1000));
        }
      }}
      onEnd={() => {
        setPlaying(false);
        setShowControls(true);
      }}
    />
  );

  // ─── Fullscreen Video (separate instance that seeks to saved position) ──────
  const fullscreenVideoElement = (
    <Video
      ref={fullscreenVideoRef}
      source={{ uri: videoUri }}
      style={StyleSheet.absoluteFill}
      resizeMode="contain"
      // FIX 2: auto-plays when fullscreen opens, sharing the same playing state
      paused={!playing}
      muted={isMuted}
      repeat
      controls={false}
      playInBackground={false}
      playWhenInactive={false}
      ignoreSilentSwitch="ignore"
      onLoad={({ duration }) => {
        setDurationMillis(toSafeMs(duration * 1000));
        // FIX 2: Seek to where the card video was, then resume playback
        const seekTo = positionMillis / 1000;
        fullscreenVideoRef.current?.seek(seekTo);
        setPlaying(true);
        setShowControls(false);
      }}
      onProgress={({ currentTime }) => {
        setPositionMillis(toSafeMs(currentTime * 1000));
      }}
      onEnd={() => {
        setPlaying(false);
        setShowControls(true);
      }}
    />
  );

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
            <Text style={[styles.profileName, { fontSize: titleSize - 2 }]}>
              {item?.profileName || "Radio Yeraz"}
            </Text>
            <View style={styles.profileMeta}>
              <Text style={styles.profileMetaText}>{postedTime}</Text>
              <Text style={styles.metaDot}> - </Text>
              <Text style={styles.profileMetaText}>{location}</Text>
            </View>
          </View>
        </View>

        {(hasVideo || hasImage) && (
          <View
            style={[
              styles.mediaContainer,
              { aspectRatio: mediaAspectRatio, maxHeight: mediaMaxHeight },
            ]}
          >
            {hasVideo ? (
              <>
                {cardVideoElement}

                {!showControls && (
                  <Pressable
                    style={styles.showControlsLayer}
                    onPress={() => setShowControls(true)}
                  />
                )}

                {!showControls && (
                  <View style={styles.topRightBadges}>
                    <Pressable style={styles.iconBadge} onPress={toggleMute}>
                      <Ionicons
                        name={isMuted ? "volume-mute" : "volume-high"}
                        size={16}
                        color="#fff"
                      />
                    </Pressable>
                  </View>
                )}

                {showControls && renderVideoControls(false)}
              </>
            ) : (
              <TouchableOpacity
                style={styles.imageTouchable}
                activeOpacity={0.9}
                onPress={() => {
                  setIsImageViewerVisible(true);
                  if (typeof openMedia === "function") openMedia(item);
                }}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imageFill}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={[styles.cardContent, { padding: contentPadding }]}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              const realId = String(item?._id || item?.id || "");
              if (!realId || realId === "[id]") return;
              router.push({
                pathname: "/post/[id]",
                params: { id: realId },
              } as any);
            }}
          >
            <Text style={[styles.title, { fontSize: titleSize }]}>
              {item?.title || "No title"}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.description, { fontSize: descriptionSize }]}>
            {item?.description || "No description"}
          </Text>

          {item?.link && (
            <Text
              style={styles.link}
              onPress={async () => {
                const supported = await Linking.canOpenURL(item.link);
                if (supported) Linking.openURL(item.link);
              }}
            >
              {item.link}
            </Text>
          )}

          {(item?.location || item?.eventDate) && (
            <View style={styles.cardFooter}>
              {item?.location && (
                <View style={styles.footerItem}>
                  <Ionicons name="location-outline" size={13} color="#9ca3af" />
                  <Text style={styles.footerText}>{item.location}</Text>
                </View>
              )}
              {item?.eventDate && (
                <View style={styles.footerItem}>
                  <Ionicons name="calendar-outline" size={13} color="#9ca3af" />
                  <Text style={styles.footerText}>
                    {new Date(item.eventDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Fullscreen Video Modal ─────────────────────────────────── */}
        <Modal
          visible={isFullscreen}
          transparent={false}
          animationType="fade"
          supportedOrientations={["portrait", "landscape"]}
          onRequestClose={closeFullscreen}
        >
          <View style={styles.fullscreenContainer}>
            {fullscreenVideoElement}

            {!showControls && (
              <Pressable
                style={styles.showControlsLayer}
                onPress={() => setShowControls(true)}
              />
            )}

            {showControls && renderVideoControls(true)}
          </View>
        </Modal>

        {/* ── Image Viewer Modal ────────────────────────────────────── */}
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
    fontSize: 13,
    color: "#ffffff",
  },
  metaDot: {
    color: "#ffffff",
  },
  mediaContainer: {
    position: "relative",
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  imageTouchable: {
    width: "100%",
    height: "100%",
  },
  imageFill: {
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
  },
  topRightBadges: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 6,
    zIndex: 12,
  },
  iconBadge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: 6,
  },
  showControlsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  controlsOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 3,
  },
  controlsDismissLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  topControls: {
    position: "absolute",
    top: 10,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 10,
  },
  iconButton: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: 7,
  },
  centerControls: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    zIndex: 10,
  },
  circleControlButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  mainCircleControlButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  bottomControls: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 16,
    zIndex: 10,
    gap: 8,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressTrackHitArea: {
    paddingVertical: 10,
    justifyContent: "center",
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
    textAlign: "right",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
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
  link: {
    fontSize: 14,
    color: "#60a5fa",
    marginTop: 10,
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
    gap: 4,
  },
  footerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
