// hooks/useNotifications.ts
import { useNotificationStore } from "@/stores/notificationStore";
import {
  NOTIFICATION_CHANNEL_ID,
  ensureNotificationChannel,
} from "@/services/notificationPermissions.service";
import { normalizeNotificationPayload } from "@/utils/notificationPayload";
import { getApp } from "@react-native-firebase/app";
import { getMessaging, onMessage } from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { useCallback, useEffect } from "react";
import { Platform } from "react-native";

const shouldShowForegroundSystemNotification = (
  payload: ReturnType<typeof normalizeNotificationPayload>,
) => {
  return Boolean(payload?.isLivePost);
};

const scheduleForegroundSystemNotification = async (
  payload: ReturnType<typeof normalizeNotificationPayload>,
) => {
  if (
    !payload ||
    !shouldShowForegroundSystemNotification(payload) ||
    Platform.OS === "web"
  ) {
    return;
  }

  try {
    await ensureNotificationChannel();

    const identifier =
      payload.id ||
      payload._id ||
      (payload.postId ? `live-post-${payload.postId}` : undefined);

    await Notifications.scheduleNotificationAsync({
      ...(identifier ? { identifier } : {}),
      content: {
        title: payload.title,
        body: payload.message,
        data: payload.data,
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
      console.warn("[Notifications] Foreground alert failed:", error);
    }
  }
};

export function useNotifications({ listen = true }: { listen?: boolean } = {}) {
  const {
    addNotification,
    clearUnread,
    markRead: markReadStore,
  } = useNotificationStore();

  const handleIncomingNotification = useCallback(
    (payload: any, fallbackId?: string) => {
      if (!payload) return;

      addNotification({
        id: payload.id || payload._id || fallbackId || Math.random().toString(),
        _id: payload._id,
        title: payload.title || "Notification",
        message: payload.message || "",
        type: payload.type || "GENERAL",
        data: payload.data,
        createdAt: payload.createdAt || new Date().toISOString(),
        isRead: false,
      });
    },
    [addNotification],
  );

  useEffect(() => {
    if (!listen || Platform.OS === "web") return;

    let messaging: ReturnType<typeof getMessaging>;

    try {
      const app = getApp();
      messaging = getMessaging(app);
    } catch (error) {
      if (__DEV__) {
        console.warn("[FCM] Foreground listener unavailable:", error);
      }
      return;
    }

    const unsubscribeForeground = onMessage(messaging, async (remoteMessage) => {
      const normalized = normalizeNotificationPayload({
        fallbackId: remoteMessage?.messageId,
        notification: remoteMessage?.notification,
        rawData: remoteMessage?.data,
      });

      if (!normalized) return;

      handleIncomingNotification(normalized, remoteMessage?.messageId);
      await scheduleForegroundSystemNotification(normalized);
    });

    return () => {
      unsubscribeForeground();
    };
  }, [handleIncomingNotification, listen]);

  const markAllRead = useCallback(() => {
    clearUnread();
  }, [clearUnread]);

  const markRead = useCallback(
    (id: string) => {
      markReadStore(id);
    },
    [markReadStore],
  );

  return { markAllRead, markRead };
}
