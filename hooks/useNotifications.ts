// hooks/useNotifications.ts
import { useNotificationStore } from "@/stores/notificationStore";
import { getApp } from "@react-native-firebase/app";
import { getMessaging, onMessage } from "@react-native-firebase/messaging";
import { useCallback, useEffect } from "react";

export function useNotifications() {
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
    const app = getApp();
    const messaging = getMessaging(app);

    const unsubscribeForeground = onMessage(messaging, async (remoteMessage) => {
      const rawData = remoteMessage?.data ?? {};
      let parsedData: any = undefined;

      if (typeof rawData.data === "string") {
        try {
          parsedData = JSON.parse(rawData.data);
        } catch {
          parsedData = rawData.data;
        }
      }

      const hasParsedObject =
        parsedData && typeof parsedData === "object" && !Array.isArray(parsedData);

      const notificationType = rawData.type || "GENERAL";
      const line1 =
        rawData.title ||
        parsedData?.title ||
        remoteMessage?.notification?.title ||
        "Notification";
      const line2 =
        rawData.description ||
        parsedData?.description ||
        rawData.message ||
        parsedData?.message ||
        remoteMessage?.notification?.body ||
        "";
      const normalizedTitle = line2 ? `${String(line1)}\n${String(line2)}` : String(line1);

      const normalized = {
        id: rawData.id || rawData._id,
        _id: rawData._id,
        title: normalizedTitle,
        message: rawData.message || remoteMessage?.notification?.body || "",
        type: notificationType,
        data: hasParsedObject ? parsedData : rawData,
        createdAt: rawData.createdAt || new Date().toISOString(),
      };

      handleIncomingNotification(normalized, remoteMessage?.messageId);
    });

    return () => {
      unsubscribeForeground();
    };
  }, [handleIncomingNotification]);

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
