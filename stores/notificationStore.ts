// stores/notificationStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { notificationSoundService } from "@/services/notificationSound.service";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface AppNotification {
  id: string;
  _id?: string;
  title: string;
  message: string;
  type: string;
  data?: any;
  createdAt: string;
  isRead: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NOTIFICATION_RETENTION_MS = DAY_MS;

const getNotificationTimestamp = (notification: AppNotification) => {
  const timestamp = new Date(notification.createdAt).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const isNotificationFresh = (
  notification: AppNotification,
  now = Date.now(),
) => {
  const timestamp = getNotificationTimestamp(notification);

  if (timestamp === null) {
    return true;
  }

  return now - timestamp <= NOTIFICATION_RETENTION_MS;
};

const filterFreshNotifications = (notifications: AppNotification[]) => {
  const now = Date.now();
  return notifications.filter((notification) =>
    isNotificationFresh(notification, now),
  );
};

const countUnread = (notifications: AppNotification[]) =>
  notifications.filter((notification) => !notification.isRead).length;

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: AppNotification) => void;
  setNotifications: (ns: AppNotification[]) => void;
  setUnreadCount: (count: number) => void;
  clearUnread: () => void;
  markRead: (id: string) => void;
  pruneExpired: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (n) => {
        const { notifications } = get();
        const incomingIds = [n.id, n._id].filter(Boolean);

        // Prevent duplicates.
        if (
          incomingIds.length > 0 &&
          notifications.some((existing) =>
            incomingIds.some(
              (id) => existing.id === id || existing._id === id,
            ),
          )
        ) {
          return;
        }

        const filtered = filterFreshNotifications(notifications);

        notificationSoundService.play();
        const nextNotifications = [n, ...filtered].slice(0, 50);

        set({
          notifications: nextNotifications,
          unreadCount: countUnread(nextNotifications),
        });
      },

      setNotifications: (ns) => {
        const filtered = filterFreshNotifications(ns);

        set({
          notifications: filtered,
          unreadCount: countUnread(filtered),
        });
      },

      setUnreadCount: (count) => set({ unreadCount: count }),

      clearUnread: () =>
        set((state) => ({
          unreadCount: 0,
          notifications: state.notifications.map((n) => ({
            ...n,
            isRead: true,
          })),
        })),

      markRead: (id) =>
        set((state) => {
          const notifications = state.notifications.map((notification) =>
            notification.id === id || notification._id === id
              ? { ...notification, isRead: true }
              : notification,
          );

          return {
            notifications,
            unreadCount: countUnread(notifications),
          };
        }),

      pruneExpired: () =>
        set((state) => {
          const filtered = filterFreshNotifications(state.notifications);

          if (filtered.length === state.notifications.length) {
            return state;
          }

          return {
            notifications: filtered,
            unreadCount: countUnread(filtered),
          };
        }),
    }),
    {
      name: "notifications-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        notifications: filterFreshNotifications(state.notifications),
        unreadCount: countUnread(filterFreshNotifications(state.notifications)),
      }),
      onRehydrateStorage: () => (state) => {
        state?.pruneExpired();
      },
    },
  ),
);
