import ZoomableImage from "@/components/ZoomableImage";
import { IMAGE_URL } from "@/services/mobileApi";
import { useVideoProgress } from "@/stores/videoProgressStore";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { memo, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import Video, {
  OnLoadData,
  OnProgressData,
  VideoRef,
} from "react-native-video";

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
  const controlsTimeoutRef = useRef<number | null>(null);
  const loadTimeoutRef = useRef<number | null>(null);

  const { getProgress, setProgress } = useVideoProgress();
  const postId = String(item?._id || item?.id || "");

  const [playing, setPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isImageViewerVisible, setIsImageViewerVisible] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(Platform.OS === "web");
  const [durationMillis, setDurationMillis] = useState(0);
  const [positionMillis, setPositionMillis] = useState(0);
  const [progressTrackWidth, setProgressTrackWidth] = useState(0);
  const [bufferedPercent, setBufferedPercent] = useState(0);

  // Video loading states
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

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

  // Auto-hide controls after 3 seconds when playing
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

  // Load saved progress on mount
  useEffect(() => {
    if (postId && hasVideo) {
      const savedProgress = getProgress(postId);
      if (savedProgress > 0) {
        setPositionMillis(savedProgress * 1000);
      }
    }
  }, [postId, hasVideo, getProgress]);

  // Seek to saved position after video is ready
  useEffect(() => {
    if (videoReady && postId && hasVideo) {
      const savedProgress = getProgress(postId);
      if (savedProgress > 0) {
        const seekTimeout = setTimeout(() => {
          videoRef.current?.seek(savedProgress);
        }, 300);
        return () => clearTimeout(seekTimeout);
      }
    }
  }, [videoReady, postId, hasVideo, getProgress]);

  // Save progress when position changes
  useEffect(() => {
    if (postId && hasVideo && positionMillis > 0 && durationMillis > 0) {
      const debounce = setTimeout(() => {
        setProgress(postId, Math.floor(positionMillis / 1000));
      }, 1000);
      return () => clearTimeout(debounce);
    }
  }, [postId, hasVideo, positionMillis, durationMillis, setProgress]);

  // Pause when scrolling
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPlaying(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Video load timeout protection (15 seconds)
  useEffect(() => {
    if (hasVideo && videoLoading) {
      loadTimeoutRef.current = setTimeout(() => {
        if (videoLoading) {
          console.warn("Video load timeout for:", videoUri);
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
  }, [hasVideo, videoLoading, videoUri]);

  const toggleVideo = () => {
    if (!hasVideo || !videoReady) return;
    const newPlayingState = !playing;
    setPlaying(newPlayingState);

    if (newPlayingState) {
      scheduleHideControls();
    } else {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
    setShowControls(true);
    scheduleHideControls();
  };

  const openFullscreen = () => {
    if (!videoReady) return;
    setIsFullscreen(true);
    StatusBar.setHidden(true);
    setShowControls(true);
    scheduleHideControls();
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    StatusBar.setHidden(false);
    setShowControls(true);
  };

  const skipBy = (seconds: number) => {
    if (!hasVideo || durationMillis <= 0 || !videoReady) return;
    const nextMs = Math.max(
      0,
      Math.min(durationMillis, positionMillis + seconds * 1000),
    );
    videoRef.current?.seek(nextMs / 1000);
    setPositionMillis(nextMs);
    setShowControls(true);
    scheduleHideControls();
  };

  const handleSeekPress = (
    event: GestureResponderEvent,
    trackWidth: number,
  ) => {
    if (!hasVideo || durationMillis <= 0 || trackWidth <= 0 || !videoReady)
      return;
    const locationX = Number(event?.nativeEvent?.locationX);
    if (!Number.isFinite(locationX)) return;
    const ratio = Math.max(0, Math.min(1, locationX / trackWidth));
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

  const handleVideoLoad = (data: OnLoadData) => {
    const duration = toSafeMs(data.duration * 1000);
    setDurationMillis(duration);
    setVideoLoading(false);
    setVideoReady(true);
    setVideoError(false);

    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
    }
  };

  const handleVideoProgress = (data: OnProgressData) => {
    const current = toSafeMs(data.currentTime * 1000);

    setPositionMillis(current);
    setIsBuffering(false);

    if (durationMillis > 0 && data.playableDuration) {
      const buffered = ((data.playableDuration * 1000) / durationMillis) * 100;

      setBufferedPercent(Math.min(buffered, 100));
    }
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
  };

  const renderVideoControls = () => (
    <Pressable style={StyleSheet.absoluteFill} onPress={handleVideoTap}>
      {/* Semi-transparent overlay */}
      <View style={styles.controlsOverlayBg} pointerEvents="none" />

      {/* Top controls */}
      <View style={styles.topControls} pointerEvents="box-none">
        <Pressable
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={20}
            color="#fff"
          />
        </Pressable>
        <Pressable
          style={styles.iconButton}
          onPress={(e) => {
            e.stopPropagation();

            if (isFullscreen) {
              closeFullscreen();
            } else {
              openFullscreen();
            }
          }}
        >
          <Ionicons
            name={isFullscreen ? "contract" : "expand"}
            size={20}
            color="#fff"
          />
        </Pressable>
      </View>

      {/* Center playback controls */}
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
          onPress={(e) => {
            e.stopPropagation();
            skipBy(-10);
          }}
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
          onPress={(e) => {
            e.stopPropagation();
            toggleVideo();
          }}
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
          onPress={(e) => {
            e.stopPropagation();
            skipBy(10);
          }}
        >
          <Ionicons name="play-forward" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Bottom progress bar and time */}
      <View style={styles.bottomControls}>
        <Pressable
          style={styles.progressTrackHitArea}
          onLayout={(e) => setProgressTrackWidth(e.nativeEvent.layout.width)}
          onPress={(e) => handleSeekPress(e, progressTrackWidth)}
        >
          <View style={styles.progressTrack}>
            {/* Buffered gray line */}
            <View
              style={[
                styles.progressBuffered,
                { width: `${bufferedPercent}%` },
              ]}
            />

            {/* Played red line */}
            <View
              style={[styles.progressFill, { width: `${progressPercent}%` }]}
            />

            {/* Thumb */}
            <View
              style={[styles.progressThumb, { left: `${progressPercent}%` }]}
            />
          </View>
        </Pressable>
        <Text style={styles.timeText}>
          {formatMs(positionMillis)} / {formatMs(durationMillis)}
        </Text>
      </View>
    </Pressable>
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
        {/* Profile Header */}
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

        {/* Media Container */}
        {(hasVideo || hasImage) && (
          <View
            style={[
              styles.mediaContainer,
              { aspectRatio: mediaAspectRatio, maxHeight: mediaMaxHeight },
            ]}
          >
            {hasVideo ? (
              <>
                {videoUri && !videoError && (
                  <Video
                    ref={videoRef}
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
                    posterResizeMode="contain"
                  />
                )}

                {/* Loading spinner */}
                {(videoLoading || isBuffering) && !videoError && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ef4444" />
                    <Text style={styles.loadingText}>
                      {videoLoading ? "Loading video..." : "Buffering..."}
                    </Text>
                  </View>
                )}

                {/* Error state */}
                {videoError && (
                  <View style={styles.errorContainer}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={48}
                      color="#ef4444"
                    />
                    <Text style={styles.errorText}>Failed to load video</Text>
                    <Pressable
                      style={styles.retryButton}
                      onPress={retryVideoLoad}
                    >
                      <Text style={styles.retryText}>Retry</Text>
                    </Pressable>
                  </View>
                )}

                {/* Tap layer to show/hide controls */}
                {!videoLoading &&
                  !videoError &&
                  videoReady &&
                  !showControls && (
                    <Pressable
                      style={styles.videoTapLayer}
                      onPress={handleVideoTap}
                    />
                  )}
                {/* Minimal badge when controls are hidden */}
                {!showControls && playing && !isBuffering && videoReady && (
                  <View style={styles.topRightBadges}>
                    <View style={styles.iconBadge}>
                      <Ionicons
                        name={isMuted ? "volume-mute" : "volume-high"}
                        size={16}
                        color="#fff"
                      />
                    </View>
                  </View>
                )}

                {/* Full controls overlay */}
                {showControls &&
                  videoReady &&
                  !videoError &&
                  renderVideoControls()}
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

        {/* Card Content */}
        <View style={[styles.cardContent, { padding: contentPadding }]}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => {
              if (!postId || postId === "[id]") return;
              const currentSeconds = Math.floor(positionMillis / 1000);
              setPlaying(false);
              setShowControls(true);

              router.push({
                pathname: "/post/[id]",
                params: {
                  id: postId,
                  startAt: String(currentSeconds),
                  autoplay: "false",
                },
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

        {/* Fullscreen Video Modal */}
        <Modal
          visible={isFullscreen}
          transparent={false}
          animationType="fade"
          supportedOrientations={["portrait", "landscape"]}
          onRequestClose={closeFullscreen}
        >
          <View style={styles.fullscreenContainer}>
            {videoUri && !videoError && (
              <Video
                ref={videoRef}
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
              />
            )}

            {/* Loading/buffering in fullscreen */}
            {isBuffering && !videoError && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ef4444" />
              </View>
            )}

            {/* Tap layer */}
            {/* Tap layer */}
            {videoReady && !videoError && !showControls && (
              <Pressable
                style={styles.videoTapLayer}
                onPress={handleVideoTap}
              />
            )}

            {/* Controls */}
            {showControls && videoReady && !videoError && renderVideoControls()}
          </View>
        </Modal>

        {/* Image Viewer Modal */}
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
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 20,
  },
  loadingText: {
    color: "#fff",
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    padding: 20,
    zIndex: 20,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 12,
    marginBottom: 16,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
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
  topRightBadges: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    gap: 6,
    zIndex: 15,
    pointerEvents: "none",
  },
  iconBadge: {
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    padding: 6,
  },
  controlsOverlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 6,
    pointerEvents: "none",
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
  progressBuffered: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.45)",
    borderRadius: 999,
  },
});
