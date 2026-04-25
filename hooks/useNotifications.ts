// hooks/useNotifications.ts
import { socketService } from "@/services/socket.service";
import { useNotificationStore } from "@/stores/notificationStore";
import { useCallback, useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

export function useNotifications() {
  const {
    addNotification,
    clearUnread,
    markRead: markReadStore,
  } = useNotificationStore();
  const appStateRef = useRef(AppState.currentState);

  // ← Move useCallback OUTSIDE useEffect
  const handleNewNotification = useCallback(
    (data: any) => {
      addNotification({
        id: data.id || data._id || Math.random().toString(),
        _id: data._id,
        title: data.title,
        message: data.message,
        type: data.type,
        data: data.data,
        createdAt: data.createdAt || new Date().toISOString(),
        isRead: false,
      });
    },
    [addNotification],
  );

  const handleAdminNotification = useCallback(
    (data: any) => {
      // if (
      //   data?.type === "AD_CREATED" ||
      //   data?.type === "AD_UPDATED" ||
      //   data?.type === "AD_DELETED" ||
      //   data?.type === "AD_TOGGLED"
      // ) {
      //   addNotification({
      //     id: data.id || data._id || Math.random().toString(),
      //     _id: data._id,
      //     title: `📢 ${data.title || "New Advertisement"}`,
      //     message: data.message,
      //     type: data.type,
      //     data: data.data,
      //     createdAt: data.createdAt || new Date().toISOString(),
      //     isRead: false,
      //   });
      // }
    },
    [addNotification],
  );

  useEffect(() => {
    socketService.connect();

    socketService.on("new_notification", handleNewNotification);
    socketService.on("admin_notification", handleAdminNotification);

    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "active" && appStateRef.current !== "active") {
        socketService.connect();
      }
      appStateRef.current = state;
    });

    return () => {
      sub.remove();
      socketService.off("new_notification", handleNewNotification);
      socketService.off("admin_notification", handleAdminNotification);
    };
  }, [handleNewNotification, handleAdminNotification]);

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
