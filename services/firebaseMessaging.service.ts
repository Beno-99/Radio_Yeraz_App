import {
  NOTIFICATION_CHANNEL_ID,
  ensureNotificationChannel,
} from "@/services/notificationPermissions.service";
import { normalizeNotificationPayload } from "@/utils/notificationPayload";
import { getApp } from "@react-native-firebase/app";
import {
  type FirebaseMessagingTypes,
  getToken,
  getMessaging,
  onTokenRefresh,
  setBackgroundMessageHandler,
  subscribeToTopic,
} from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const CLIENT_TOPIC = "client";

let backgroundHandlerRegistered = false;
let clientTopicRegistered = false;
let tokenLoggerRegistered = false;

async function scheduleBackgroundDataOnlyLiveNotification(
  remoteMessage: FirebaseMessagingTypes.RemoteMessage,
) {
  const hasSystemNotification = Boolean(
    remoteMessage.notification?.title || remoteMessage.notification?.body,
  );
  if (hasSystemNotification) return;

  const normalized = normalizeNotificationPayload({
    fallbackId: remoteMessage.messageId,
    notification: remoteMessage.notification,
    rawData: remoteMessage.data,
  });

  if (!normalized?.isLivePost) return;

  try {
    await ensureNotificationChannel();

    const identifier =
      normalized.id ||
      normalized._id ||
      (normalized.postId ? `live-post-${normalized.postId}` : undefined);

    await Notifications.scheduleNotificationAsync({
      ...(identifier ? { identifier } : {}),
      content: {
        title: normalized.title,
        body: normalized.message,
        data: normalized.data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: "#D71920",
        vibrate: [0, 180, 120, 180],
      },
      trigger:
        Platform.OS === "android"
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 1,
              channelId: NOTIFICATION_CHANNEL_ID,
            }
          : null,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn("[FCM] Background live notification failed:", error);
    }
  }
}

export function registerFirebaseBackgroundHandler() {
  if (backgroundHandlerRegistered || Platform.OS === "web") return;

  try {
    const messaging = getMessaging(getApp());

    setBackgroundMessageHandler(
      messaging,
      async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        await scheduleBackgroundDataOnlyLiveNotification(remoteMessage);

        if (__DEV__) {
          console.log("[FCM] Background message handled", {
            data: remoteMessage.data,
            messageId: remoteMessage.messageId,
          });
        }
      },
    );

    backgroundHandlerRegistered = true;
  } catch (error) {
    if (__DEV__) {
      console.warn("[FCM] Background handler unavailable:", error);
    }
  }
}

export function registerFirebaseClientTopic() {
  if (clientTopicRegistered || Platform.OS === "web") return;

  try {
    const messaging = getMessaging(getApp());
    clientTopicRegistered = true;

    subscribeToTopic(messaging, CLIENT_TOPIC)
      .then(() => {
        if (__DEV__) {
          console.log(`[FCM] Subscribed to topic: ${CLIENT_TOPIC}`);
        }
      })
      .catch((error) => {
        clientTopicRegistered = false;
        if (__DEV__) {
          console.warn("[FCM] Topic subscription failed:", error);
        }
      });
  } catch (error) {
    clientTopicRegistered = false;
    if (__DEV__) {
      console.warn("[FCM] Topic subscription unavailable:", error);
    }
  }
}

export function registerFirebaseTokenLogger() {
  if (!__DEV__ || tokenLoggerRegistered || Platform.OS === "web") return;

  try {
    const messaging = getMessaging(getApp());

    getToken(messaging)
      .then((token) => {
        console.log("[FCM_TOKEN]", token);
      })
      .catch((error) => {
        console.warn("[FCM] Token read failed:", error);
      });

    onTokenRefresh(messaging, (token) => {
      console.log("[FCM_TOKEN_REFRESHED]", token);
    });

    tokenLoggerRegistered = true;
  } catch (error) {
    console.warn("[FCM] Token logger unavailable:", error);
  }
}

registerFirebaseBackgroundHandler();
registerFirebaseClientTopic();
registerFirebaseTokenLogger();
