// stores/notificationStore.ts
import { notificationSoundService } from "@/services/notificationSound.service";
import { create } from "zustand";

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

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: AppNotification) => void;
  setNotifications: (ns: AppNotification[]) => void;
  setUnreadCount: (count: number) => void;
  clearUnread: () => void;
  markRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) => {
    const { notifications } = get();

    // ← Prevent duplicates
    if (
      notifications.some(
        (existing) => existing.id === n.id || existing._id === n.id,
      )
    ) {
      return;
    }

    // ← Remove notifications older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const filtered = notifications.filter(
      (n) => new Date(n.createdAt) > sevenDaysAgo,
    );

    notificationSoundService.play();
    set({
      notifications: [n, ...filtered].slice(0, 50),
      unreadCount: get().unreadCount + 1,
    });
  },

  setNotifications: (ns) => set({ notifications: ns }),

  setUnreadCount: (count) => set({ unreadCount: count }),

  clearUnread: () =>
    set((state) => ({
      unreadCount: 0,
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    })),

  markRead: (id) =>
    set((state) => {
      const target = state.notifications.find((n) => n.id === id || n._id === id);
      const removedUnread = target && !target.isRead ? 1 : 0;

      return {
        notifications: state.notifications.filter(
          (n) => n.id !== id && n._id !== id,
        ),
        unreadCount: Math.max(0, state.unreadCount - removedUnread),
      };
    }),
}));
