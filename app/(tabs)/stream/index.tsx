import PageHeader from "@/components/PageHeader";
import { IMAGE_URL, mobileApi } from "@/services/mobileApi";
import { requestUserPermission } from "@/services/notificationPermissions.service";
import { socketService } from "@/services/socket.service";
import { Ionicons } from "@expo/vector-icons";
import { getApp } from "@react-native-firebase/app";
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onMessage,
  requestPermission,
  setBackgroundMessageHandler,
  subscribeToTopic,
} from "@react-native-firebase/messaging";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Dimensions,
  Image,
  Linking,
  LogBox,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

LogBox.ignoreLogs(["Unable to activate keep awake", "Uncaught (in promise"]);

// const STREAM_URL = "https://streaming05.liveboxstream.uk/proxy/radioye3/stream";
const STREAM_URL =
  process.env.EXPO_PUBLIC_STREAM_URL ||
  "https://streaming05.liveboxstream.uk/proxy/radioye3/stream";
const STREAM_METADATA_URL = process.env.EXPO_PUBLIC_STREAM_METADATA_URL || "";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const fallbackImage = require("@/assets/images/sublogo.png");
const [nowPlaying, setNowPlaying] = useState("Loading...");
const [trackTitle, setTrackTitle] = useState("LIVE STREAM");

const app = getApp();
const messaging = getMessaging(app);

setBackgroundMessageHandler(messaging, async (remoteMessage) => {
  console.log("Message handled in the background!", remoteMessage);
});

async function getDeviceToken() {
  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    const token = await getToken(messaging);
    console.log("FCM Token:", token);
    return token;
  }

  console.log("Permission denied");
  return null;
}

async function subscribeToTopicHandler(topic: string) {
  await subscribeToTopic(messaging, topic);
  console.log("Subscribed to topic:", topic);
}

function AudioPlayerComponent({
  uri,
  nowPlaying,
}: {
  uri: string;
  nowPlaying: string;
}) {
  const player = useAudioPlayer({ uri });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (status?.playing) {
      player.setActiveForLockScreen(true, {
        title: nowPlaying || "LIVE STREAM",
        artist: "Radio Yeraz • Syria",
        albumTitle: "Radio Yeraz",
        artworkUrl: "https://www.radioyeraz.com/radiojpg",
      });
    }
  }, [nowPlaying, status?.playing]);

  return null;
}

export default function RadioPlayer() {
  const [playerKey, setPlayerKey] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlayEnabled] = useState(true);
  const [nowPlaying, setNowPlaying] = useState("Loading...");
  const [ads, setAds] = useState<any[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);
  const spin = useSharedValue(0);

  const player = useAudioPlayer({ uri: STREAM_URL });
  const status = useAudioPlayerStatus(player);

  const isPlaying = status?.playing ?? false;
  const isBuffering = status?.isBuffering ?? false;

  const fetchAds = useCallback(async (silent = false) => {
    try {
      if (!silent) setAdsLoading(true);
      const { data } = await mobileApi.get("/ads", {
        params: { isActive: true },
      });
      setAds(data?.data ?? []);
    } catch (err: any) {
      console.log("Ads fetch error:", err);
    } finally {
      setAdsLoading(false);
    }
  }, []);

  useEffect(() => {
    const setupNotifications = async () => {
      try {
        await getDeviceToken();
        await subscribeToTopicHandler("all");
        const hasPermission = await requestUserPermission();
        if (hasPermission) {
          await getToken(messaging);
          const unsubscribe = onMessage(messaging, async (remoteMessage) => {
            console.log("A new FCM message arrived!", remoteMessage);
          });
          return unsubscribe;
        }
      } catch (error) {
        console.error("FCM Setup Error:", error);
      }
      return undefined;
    };

    let unsubscribeForeground: undefined | (() => void);

    setupNotifications().then((unsubscribe) => {
      unsubscribeForeground = unsubscribe;
    });

    return () => {
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, []);

  useEffect(() => {
    fetchAds();

    const appStateSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") fetchAds(true);
      },
    );

    const handleAdminNotification = (data: any) => {
      if (
        ["AD_CREATED", "AD_UPDATED", "AD_DELETED", "AD_TOGGLED"].includes(
          data?.type,
        )
      ) {
        fetchAds(true);
      }
    };

    socketService.on("admin_notification", handleAdminNotification);

    return () => {
      appStateSub.remove();
      socketService.off("admin_notification", handleAdminNotification);
    };
  }, [fetchAds]);

  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchNowPlaying = async () => {
      if (!STREAM_METADATA_URL) return;

      try {
        const response = await fetch(STREAM_METADATA_URL);
        const data = await response.json();

        const source = data?.icestats?.source;
        const stream = Array.isArray(source) ? source[0] : source;

        const title =
          stream?.title || stream?.song || stream?.server_name || "LIVE STREAM";

        if (mounted) setTrackTitle(title);
      } catch (error) {
        console.log("Metadata error:", error);
        if (mounted) setTrackTitle("LIVE STREAM");
      }
    };

    fetchNowPlaying();
    interval = setInterval(fetchNowPlaying, 60000);

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      wave1.value = withRepeat(withTiming(1, { duration: 2000 }), -1);
      wave2.value = withDelay(
        600,
        withRepeat(withTiming(1, { duration: 2000 }), -1),
      );
      wave3.value = withDelay(
        1200,
        withRepeat(withTiming(1, { duration: 2000 }), -1),
      );
    } else {
      cancelAnimation(wave1);
      cancelAnimation(wave2);
      cancelAnimation(wave3);
      wave1.value = withTiming(0, { duration: 300 });
      wave2.value = withTiming(0, { duration: 300 });
      wave3.value = withTiming(0, { duration: 300 });
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isBuffering) {
      spin.value = withRepeat(withTiming(1, { duration: 1400 }), -1, false);
    } else {
      cancelAnimation(spin);
      spin.value = 0;
    }
  }, [isBuffering]);

  useEffect(() => {
    const items = ads.length > 0 ? ads : [fallbackImage];

    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }

    if (items.length <= 1 || !autoPlayEnabled) return;

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = (prev + 1) % items.length;
        scrollRef.current?.scrollTo({
          x: nextIndex * SCREEN_WIDTH,
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);

    return () => {
      if (autoPlayTimerRef.current) {
        clearInterval(autoPlayTimerRef.current);
        autoPlayTimerRef.current = null;
      }
    };
  }, [autoPlayEnabled, ads]);

  const handleScroll = (event: any) => {
    const newIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
    );
    if (newIndex !== currentIndex) setCurrentIndex(newIndex);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAds(false)]);
    setPlayerKey((prev) => prev + 1);
    setRefreshing(false);
  }, [fetchAds]);

  const togglePlayback = () => {
    if (isPlaying || player.playing) {
      player.pause();
      player.setActiveForLockScreen(false);
    } else {
      player.setActiveForLockScreen(true, {
        title: nowPlaying || "LIVE STREAM",
        artist: "Radio Yeraz • Syria",
        albumTitle: "Radio Yeraz",
        artworkUrl: "https://www.radioyeraz.com/radioLogo-300.jpg",
      });
      player.play();
    }
  };

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

  const carouselItems = ads.length > 0 ? ads : [fallbackImage];

  return (
    <LinearGradient
      colors={["#0f172a", "#1e293b", "#0f3460"]}
      style={styles.gradient}
    >
      <PageHeader />

      <AudioPlayerComponent
        key={playerKey}
        uri={STREAM_URL}
        nowPlaying={nowPlaying}
      />

      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          scrollEnabled={false}
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
          <View style={styles.content}>
            <View style={styles.headerSection}>
              <Text style={styles.header}>RADIO YERAZ</Text>
              <Text style={styles.subHeader}>Հայկական երաժշտութիուն 24/7</Text>
            </View>

            <View style={styles.logoContainer}>
              <Animated.View
                style={[styles.wave, styles.wave1, animatedWave1]}
              />
              <Animated.View
                style={[styles.wave, styles.wave2, animatedWave2]}
              />
              <Animated.View
                style={[styles.wave, styles.wave3, animatedWave3]}
              />

              {isBuffering ? (
                <Animated.View style={[styles.spinnerRing, animatedSpinner]} />
              ) : null}

              <Image
                source={require("@/assets/images/radioLogo.jpg")}
                style={styles.logo}
              />
            </View>

            <View style={styles.nowPlayingContainer}>
              <View style={styles.titleBadge}>
                <Text style={styles.songTitle} numberOfLines={1}>
                  {trackTitle}
                </Text>
              </View>
              <Text style={styles.artistName}>Radio Yeraz • Syria</Text>
            </View>

            <View style={styles.controlsSection}>
              <View style={styles.liveContainer}>
                <View
                  style={[
                    styles.liveDot,
                    isPlaying ? styles.liveDotOn : styles.liveDotOff,
                  ]}
                />
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progress,
                      isPlaying && styles.progressActive,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.liveText,
                    isPlaying ? styles.liveTextOn : styles.liveTextOff,
                  ]}
                >
                  {isPlaying ? "LIVE" : "PAUSED"}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayback}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#e94560", "#ff6b6b"]}
                  style={styles.playButtonGradient}
                >
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={32}
                    color="white"
                    style={{ marginLeft: isPlaying ? 0 : 6 }}
                  />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.carouselSection}>
              {adsLoading ? (
                <ActivityIndicator
                  size="small"
                  color="#e94560"
                  style={{ marginTop: 50 }}
                />
              ) : (
                <>
                  <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    style={styles.carouselScroll}
                  >
                    {carouselItems.map((item, index) => (
                      <TouchableOpacity
                        key={item._id || index}
                        activeOpacity={item.targetUrl ? 0.7 : 1}
                        onPress={() =>
                          item.targetUrl && Linking.openURL(item.targetUrl)
                        }
                        disabled={!item.targetUrl}
                        style={styles.carouselItem}
                      >
                        <Image
                          source={
                            item.image ? { uri: IMAGE_URL + item.image } : item
                          }
                          style={styles.carouselImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={styles.paginationContainer}>
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
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 80,
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
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 15,
  },
  wave: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
  },
  wave1: { borderColor: "#e94560" },
  wave2: { borderColor: "#ff6b6b" },
  wave3: { borderColor: "#ff8fa3" },
  logo: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
    borderColor: "#ffffff25",
  },
  spinnerRing: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 4,
    borderColor: "rgba(233, 69, 96, 0.8)",
    borderTopColor: "transparent",
  },
  nowPlayingContainer: { alignItems: "center", marginBottom: 4 },
  titleBadge: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: SCREEN_WIDTH - 60,
  },
  songTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  artistName: { fontSize: 15, color: "#cbd5e1", marginTop: 8 },
  controlsSection: { alignItems: "center", gap: 15, marginBottom: 20 },
  liveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "70%",
  },
  liveDot: { width: 10, height: 10, borderRadius: 5 },
  liveDotOn: { backgroundColor: "#e94560" },
  liveDotOff: { backgroundColor: "#64748b" },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
    overflow: "hidden",
  },
  progress: { width: "100%", height: "100%", backgroundColor: "#334155" },
  progressActive: { backgroundColor: "#e94560" },
  liveText: { fontSize: 13, fontWeight: "bold" },
  liveTextOn: { color: "#e94560" },
  liveTextOff: { color: "#64748b" },
  playButton: {
    shadowColor: "#e94560",
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 5,
    marginTop: -10,
    marginBottom: 3,
  },
  playButtonGradient: {
    width: 55,
    height: 55,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  carouselSection: {
    width: SCREEN_WIDTH,
    height: 150,
    alignItems: "center",
    marginTop: -18,
  },
  carouselScroll: { width: SCREEN_WIDTH, height: 135 },
  carouselItem: {
    width: SCREEN_WIDTH,
    height: 135,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  carouselImage: { width: SCREEN_WIDTH - 40, height: 125, borderRadius: 16 },
  paginationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
});
