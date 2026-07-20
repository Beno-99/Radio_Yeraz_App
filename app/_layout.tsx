// app/_layout.tsx
import { BrowserApiFallbackProvider } from "@/components/BrowserApiFallbackProvider";
import FirebaseNotificationListener from "@/components/FirebaseNotificationListener";
import FixedTabBar from "@/components/FixedTabBar";
import { NetworkContext, NetworkProvider } from "@/components/NetworkProvider";
import NotificationPermissionPrompt from "@/components/NotificationPermissionPrompt";
import { OfflineScreen } from "@/components/OfflineScreen";
import { useNotificationStore } from "@/stores/notificationStore";
import { markNotificationOpenIntent } from "@/utils/notificationOpenIntent";
import { normalizeNotificationPayload } from "@/utils/notificationPayload";
import { getApp } from "@react-native-firebase/app";

import {
  type FirebaseMessagingTypes,
  getInitialNotification,
  getMessaging,
  onNotificationOpenedApp,
} from "@react-native-firebase/messaging";
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useContext, useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

const APP_BACKGROUND = "#070b14";
const POST_ID_KEYS = ["postId", "post_id", "targetPostId", "target_post_id"];
const FALLBACK_POST_ID_KEYS = ["id", "_id"];
const NOTIFICATION_OPEN_DEDUPE_MS = 5000;
const NOTIFICATION_OPEN_RETRY_DELAYS_MS = [700, 1800, 3200];

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

const radioYerazTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: APP_BACKGROUND,
    border: "rgba(255,255,255,0.08)",
    card: "#121826",
    primary: "#e94560",
    text: "#ffffff",
  },
};

function AppGate({ children }: { children: React.ReactNode }) {
  const { isOffline } = useContext(NetworkContext);
  const pathname = usePathname();
  const isIntroRoute = pathname === "/";

  return (
    <View style={styles.gateRoot}>
      {children}
      {isOffline && !isIntroRoute ? (
        <View style={styles.offlineOverlay}>
          <OfflineScreen />
        </View>
      ) : null}
    </View>
  );
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const parseJsonRecord = (value: unknown) => {
  if (isRecord(value)) return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeId = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const findPostIdInRecord = (record: Record<string, unknown>): string => {
  for (const key of POST_ID_KEYS) {
    const postId = normalizeId(record[key]);
    if (postId) return postId;
  }

  const nestedPost = parseJsonRecord(record.post);
  if (nestedPost) {
    for (const key of [...POST_ID_KEYS, ...FALLBACK_POST_ID_KEYS]) {
      const postId = normalizeId(nestedPost[key]);
      if (postId) return postId;
    }
  } else {
    const postId = normalizeId(record.post);
    if (postId) return postId;
  }

  const nestedData = parseJsonRecord(record.data);
  if (nestedData) {
    const postId = findPostIdInRecord(nestedData);
    if (postId) return postId;
  }

  const notificationType = normalizeId(
    record.type || record.notificationType || record.entityType,
  ).toLowerCase();

  if (notificationType.includes("post")) {
    for (const key of FALLBACK_POST_ID_KEYS) {
      const postId = normalizeId(record[key]);
      if (postId) return postId;
    }
  }

  return "";
};

const getPostIdFromNotification = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
) => {
  const data = remoteMessage?.data;
  if (!data) return "";
  return findPostIdInRecord(data);
};

const getPostIdFromLocalNotification = (
  response: Notifications.NotificationResponse | null,
) => {
  const data = response?.notification.request.content.data;
  if (!isRecord(data)) return "";
  return findPostIdInRecord(data);
};

const getNotificationKey = (
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) => {
  const data = remoteMessage.data;
  const notificationId =
    data?.notificationId ||
    data?.notification_id ||
    data?.messageId ||
    remoteMessage.messageId;

  return normalizeId(notificationId) || getPostIdFromNotification(remoteMessage);
};

export default function RootLayout() {
  const router = useRouter();
  const handledNotificationIdsRef = useRef(new Set<string>());
  const lastNotificationPostOpenRef = useRef<{
    postId: string;
    openedAt: number;
  } | null>(null);
  const notificationOpenRetryTimersRef = useRef<ReturnType<
    typeof setTimeout
  >[]>([]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let mounted = true;
    let unsubscribeOpen: (() => void) | null = null;

    const navigateToPost = (postId: string) => {
      router.replace({
        pathname: "/post/[id]",
        params: { id: String(postId) },
      });
    };

    const addOpenedNotificationToBell = (
      payload: ReturnType<typeof normalizeNotificationPayload>,
    ) => {
      if (!payload) return;

      const id =
        payload.id ||
        payload._id ||
        payload.postId ||
        `opened-${Date.now()}`;

      useNotificationStore.getState().addNotification(
        {
          id,
          _id: payload._id,
          title: payload.title,
          message: payload.message,
          type: payload.type,
          data: payload.data,
          createdAt: payload.createdAt,
          isRead: true,
        },
        { suppressSound: true },
      );
    };

    const openPost = (
      postId: string,
      notificationKey: string,
      payload: ReturnType<typeof normalizeNotificationPayload>,
    ) => {
      addOpenedNotificationToBell(payload);

      if (!postId) return;
      if (handledNotificationIdsRef.current.has(notificationKey)) return;

      const now = Date.now();
      const lastOpen = lastNotificationPostOpenRef.current;
      if (
        lastOpen?.postId === postId &&
        now - lastOpen.openedAt < NOTIFICATION_OPEN_DEDUPE_MS
      ) {
        handledNotificationIdsRef.current.add(notificationKey);
        return;
      }

      handledNotificationIdsRef.current.add(notificationKey);
      lastNotificationPostOpenRef.current = { postId, openedAt: now };
      markNotificationOpenIntent(postId);

      navigateToPost(postId);

      NOTIFICATION_OPEN_RETRY_DELAYS_MS.forEach((delay) => {
        const timer = setTimeout(() => {
          navigateToPost(postId);
        }, delay);

        notificationOpenRetryTimersRef.current.push(timer);
      });
    };

    const openPostFromRemoteNotification = (
      remoteMessage: FirebaseMessagingTypes.RemoteMessage | null,
    ) => {
      const normalized = normalizeNotificationPayload({
        fallbackId: remoteMessage?.messageId,
        notification: remoteMessage?.notification,
        rawData: remoteMessage?.data,
      });
      const postId =
        normalized?.postId || getPostIdFromNotification(remoteMessage);
      const notificationKey = remoteMessage
        ? `fcm:${getNotificationKey(remoteMessage) || String(postId)}`
        : `fcm:${String(postId)}`;

      openPost(postId, notificationKey, normalized);
    };

    const openPostFromLocalNotification = (
      response: Notifications.NotificationResponse | null,
    ) => {
      const normalized = normalizeNotificationPayload({
        fallbackId: response?.notification.request.identifier,
        notification: {
          title: response?.notification.request.content.title,
          body: response?.notification.request.content.body,
        },
        rawData: response?.notification.request.content.data,
      });
      const postId =
        normalized?.postId || getPostIdFromLocalNotification(response);
      const requestId = response?.notification.request.identifier;
      const notificationKey = `local:${requestId || postId}`;

      openPost(postId, notificationKey, normalized);
      Notifications.clearLastNotificationResponse();
    };

    try {
      const app = getApp();
      const messaging = getMessaging(app);

      unsubscribeOpen = onNotificationOpenedApp(
        messaging,
        openPostFromRemoteNotification,
      );

      getInitialNotification(messaging)
        .then((remoteMessage) => {
          if (mounted && remoteMessage) {
            openPostFromRemoteNotification(remoteMessage);
          }
        })
        .catch((error) => {
          if (__DEV__) {
            console.warn("[FCM] Initial notification read failed:", error);
          }
        });
    } catch (error) {
      if (__DEV__) {
        console.warn("[FCM] Notification open listener unavailable:", error);
      }
    }

    const localOpenSub = Notifications.addNotificationResponseReceivedListener(
      openPostFromLocalNotification,
    );

    try {
      const localResponse = Notifications.getLastNotificationResponse();
      if (mounted && localResponse) {
        openPostFromLocalNotification(localResponse);
      }
    } catch (error) {
      if (__DEV__) {
        console.warn("[Notifications] Initial response read failed:", error);
      }
    }

    return () => {
      mounted = false;
      unsubscribeOpen?.();
      localOpenSub.remove();
      notificationOpenRetryTimersRef.current.forEach(clearTimeout);
      notificationOpenRetryTimersRef.current = [];
    };
  }, [router]);

  return (
    <NetworkProvider>
      <SafeAreaProvider>
        <ThemeProvider value={radioYerazTheme}>
          <View style={styles.root}>
            <BrowserApiFallbackProvider>
              <FirebaseNotificationListener />
              <AppGate>
                <Stack
                  screenOptions={{
                    animation: "none",
                    contentStyle: styles.screen,
                    headerShown: false,
                  }}
                >
                  <Stack.Screen name="index" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="post/[id]" />
                  <Stack.Screen
                    name="modal"
                    options={{
                      presentation: "modal",
                      title: "Modal",
                      headerShown: true,
                    }}
                  />
                </Stack>
              </AppGate>
              <FixedTabBar />
              <NotificationPermissionPrompt />
              <StatusBar
                backgroundColor={APP_BACKGROUND}
                style="light"
                translucent={false}
              />
            </BrowserApiFallbackProvider>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </NetworkProvider>
  );
}

const styles = StyleSheet.create({
  gateRoot: {
    flex: 1,
  },
  offlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  root: {
    backgroundColor: APP_BACKGROUND,
    flex: 1,
  },
  screen: {
    backgroundColor: APP_BACKGROUND,
  },
});
