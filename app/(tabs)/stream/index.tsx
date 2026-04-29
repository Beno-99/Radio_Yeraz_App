import PageHeader from "@/components/PageHeader";
import { IMAGE_URL, mobileApi } from "@/services/mobileApi";
import { requestUserPermission } from "@/services/notificationPermissions.service";
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
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Dimensions,
  Image,
  Linking,
  LogBox,
  Platform,
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

// Suppress keep-awake non-fatal error from expo-audio internals
LogBox.ignoreLogs(["Unable to activate keep awake", "Uncaught (in promise"]);

const STREAM_URL = "https://streaming05.liveboxstream.uk/proxy/radioye3/stream";
const STREAM_METADATA_URL = process.env.EXPO_PUBLIC_STREAM_METADATA_URL || "";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ARTWORK_URL =
  Platform.OS === "ios"
    ? "https://radioyeraz.com/radioLogo-1024.jpg"
    : "https://radioyeraz.com/radioLogo-512.jpg";

const fallbackImage = require("@/assets/images/sublogo.png");

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
  } else {
    console.log("Permission denied");
    return null;
  }
}

async function subscribeToTopicHandler(topic: string) {
  await subscribeToTopic(messaging, topic);
  console.log("Subscribed to topic:", topic);
}

export default function RadioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlayEnabled] = useState(true);
  const [nowPlaying, setNowPlaying] = useState("Loading...");
  const [ads, setAds] = useState<any[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const player = useAudioPlayer({ uri: STREAM_URL });

  const wave1 = useSharedValue(0);
  const wave2 = useSharedValue(0);
  const wave3 = useSharedValue(0);

  // ✅ 1. Configure audio session for background/silent playback
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    }).catch(() => {});
  }, []);

  // ✅ 2. Sync lock screen metadata whenever nowPlaying or isPlaying changes
  useEffect(() => {
    if (isPlaying) {
      player.setActiveForLockScreen(true, {
        title: nowPlaying || "LIVE STREAM",
        artist: "Radio Yeraz • Syria",
        albumTitle: "Radio Yeraz",
        // artworkUrl: ARTWORK_URL,
        artworkUrl: "https://radioyeraz.com/radioLogo-1024.jpg",
      });
    }
  }, [nowPlaying, isPlaying]);

  // ✅ 3. Firebase notifications setup
  useEffect(() => {
    const setupNotifications = async () => {
      try {
        await getDeviceToken();
        await subscribeToTopicHandler("client");

        const hasPermission = await requestUserPermission();

        if (hasPermission) {
          const token = await getToken(messaging);
          console.log("FCM Token:", token);

          const unsubscribe = onMessage(messaging, async (remoteMessage) => {
            console.log("A new FCM message arrived!", remoteMessage);
            const postId = remoteMessage.data?.postId;
            console.log("Post ID from notification:", postId);
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

  // Fetch ads
  const fetchAds = useCallback(async (silent = false) => {
    try {
      if (!silent) setAdsLoading(true);

      const { data } = await mobileApi.get("/ads", {
        params: { isActive: true },
      });

      const now = Date.now();
      const validAds = (data?.data ?? []).filter((ad: any) => {
        if (!ad?.isActive) return false;

        const status = String(ad?.status ?? "").toLowerCase();
        const isStatusValid =
          status === "" ||
          status === "approved" ||
          status === "active" ||
          status === "published";
        if (!isStatusValid) return false;

        const startAt = ad?.startDate ? new Date(ad.startDate).getTime() : NaN;
        const endAt = ad?.endDate ? new Date(ad.endDate).getTime() : NaN;

        const startsOk = !Number.isFinite(startAt) || now >= startAt;
        const endsOk = !Number.isFinite(endAt) || now <= endAt;

        return startsOk && endsOk;
      });

      setAds(validAds);
    } catch (err: any) {
      console.log("Ads fetch error:", err);
    } finally {
      setAdsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();

    const appStateSub = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") fetchAds(true);
      },
    );

    const refreshInterval = setInterval(
      () => {
        fetchAds(true);
      },
      60 * 60 * 1000,
    );

    return () => {
      appStateSub.remove();
      clearInterval(refreshInterval);
    };
  }, [fetchAds]);

  // Now playing metadata
  useEffect(() => {
    let isMounted = true;

    const fetchNowPlaying = async () => {
      if (!STREAM_METADATA_URL) {
        if (isMounted) setNowPlaying("LIVE STREAM");
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      try {
        const response = await fetch(STREAM_METADATA_URL, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) return;

        const data = await response.json();
        const title =
          data?.title || data?.nowPlaying || data?.streamTitle || "";

        if (isMounted && title.trim()) {
          setNowPlaying(title.trim());
        }
      } catch {
      } finally {
        clearTimeout(timeout);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Wave animations
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
  }, [isPlaying, wave1, wave2, wave3]);

  // ✅ Sync isPlaying state from player — this is what drives the lock screen effect above
  useEffect(() => {
    const interval = setInterval(() => {
      setIsPlaying(player.playing ?? false);
    }, 400);

    return () => clearInterval(interval);
  }, [player]);

  // Auto-scroll carousel
  useEffect(() => {
    const items = ads.length > 0 ? ads : [fallbackImage];
    if (items.length <= 1 || !autoPlayEnabled) return;

    if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);

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
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [autoPlayEnabled, ads]);

  const handleScroll = (event: any) => {
    const newIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
    );
    if (newIndex !== currentIndex) setCurrentIndex(newIndex);
  };

  const togglePlayback = () => {
    if (player.playing) {
      player.pause();
      player.setActiveForLockScreen(false);
    } else {
      player.setActiveForLockScreen(true, {
        title: nowPlaying || "LIVE STREAM",
        artist: "Radio Yeraz • Syria",
        albumTitle: "Radio Yeraz",
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

  const carouselItems = ads.length > 0 ? ads : [fallbackImage];

  return (
    <LinearGradient
      colors={["#0f172a", "#1e293b", "#0f3460"]}
      style={styles.gradient}
    >
      <PageHeader />

      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <View style={styles.content}>
          <View style={styles.headerSection}>
            <Text style={styles.header}>RADIO YERAZ</Text>
            <Text style={styles.subHeader}>Հայկական երաժշտութիուն 24/7</Text>
          </View>

          <View style={styles.logoContainer}>
            <Animated.View style={[styles.wave, styles.wave1, animatedWave1]} />
            <Animated.View style={[styles.wave, styles.wave2, animatedWave2]} />
            <Animated.View style={[styles.wave, styles.wave3, animatedWave3]} />
            <Image
              source={require("@/assets/images/radioLogo.jpg")}
              style={styles.logo}
            />
          </View>

          <View style={styles.nowPlayingContainer}>
            <Text style={styles.songTitle}>{nowPlaying || "LIVE STREAM"}</Text>
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
                  style={[styles.progress, isPlaying && styles.progressActive]}
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
  nowPlayingContainer: { alignItems: "center", marginBottom: 10 },
  songTitle: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  artistName: { fontSize: 15, color: "#cbd5e1", marginTop: 4 },
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
    marginTop: -12,
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
    height: 200,
    alignItems: "center",
    marginTop: -10,
  },
  carouselScroll: { width: SCREEN_WIDTH, height: 155 },
  carouselItem: {
    width: SCREEN_WIDTH,
    height: 155,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  carouselImage: { width: SCREEN_WIDTH - 40, height: 145, borderRadius: 16 },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginBottom: 36,
  },
  activePaginationDot: { backgroundColor: "#e94560", width: 18 },
});
