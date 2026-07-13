// services/eventReminder.service.ts
import {
  NOTIFICATION_CHANNEL_ID,
  ensureNotificationChannel,
  hasNotificationPermission,
} from "@/services/notificationPermissions.service";
import type { Post } from "@/types/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const TEST_NOW = process.env.EXPO_PUBLIC_EVENT_REMINDER_TEST_NOW;
const LOCAL_REMINDER_PREFIX = "event-reminder";
const LOCAL_REMINDER_KEYS_STORAGE = "radioyeraz:local-event-reminder-keys";
const REMINDER_HOUR = 9;
const REMINDER_MINUTE = 0;
const CATCH_UP_DELAY_SECONDS = 15;
const CATCH_UP_WINDOW_MS = 60 * 1000;

const getReminderNow = () => {
  if (!__DEV__ || !TEST_NOW) return new Date();

  const testNow = new Date(TEST_NOW);
  if (Number.isNaN(testNow.getTime())) {
    console.log(`Event reminder test date is invalid: ${TEST_NOW}`);
    return new Date();
  }

  console.log(`Event reminder test date active: ${testNow.toISOString()}`);
  return testNow;
};

const getPostId = (post: Post) => String(post._id || post.id || "");

const getReminderNotificationId = (postId: string) =>
  `${LOCAL_REMINDER_PREFIX}-${postId}`;

const getDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getLocalReminderDate = (eventDate: Date, now: Date) => {
  const eventDay = getStartOfDay(eventDate);
  const today = getStartOfDay(now);

  if (eventDay <= today) {
    return null;
  }

  const reminderDate = new Date(eventDay);
  reminderDate.setDate(eventDay.getDate() - 1);
  reminderDate.setHours(REMINDER_HOUR, REMINDER_MINUTE, 0, 0);

  if (reminderDate > now) {
    return reminderDate;
  }

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (eventDay.getTime() === tomorrow.getTime()) {
    return new Date(now.getTime() + CATCH_UP_DELAY_SECONDS * 1000);
  }

  return null;
};

const getReminderMessage = (post: Post, formattedDate: string) => {
  const time = post.eventTime ? ` at ${post.eventTime}` : "";
  return `Don't miss this event tomorrow, ${formattedDate}${time}.`;
};

const readStoredReminderKeys = async () => {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_REMINDER_KEYS_STORAGE);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
};

const writeStoredReminderKeys = async (keys: Record<string, string>) => {
  try {
    await AsyncStorage.setItem(LOCAL_REMINDER_KEYS_STORAGE, JSON.stringify(keys));
  } catch (e: any) {
    console.log("Event reminder storage error:", e?.message);
  }
};

class EventReminderService {
  private lastCheckedDate: string | null = null;

  async checkEventReminders(posts: Post[]) {
    try {
      const now = getReminderNow();
      const today = now.toDateString();

      void this.syncScheduledNotifications(posts, now);

      if (this.lastCheckedDate === today) {
        return;
      }

      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      const tomorrowEvents = posts.filter((post) => {
        if (!post.eventDate || !getPostId(post)) return false;

        const eventDate = new Date(post.eventDate);
        if (Number.isNaN(eventDate.getTime())) return false;

        return eventDate >= tomorrow && eventDate <= endOfTomorrow;
      });

      if (tomorrowEvents.length === 0) {
        console.log("No events tomorrow");
        this.lastCheckedDate = today;
        return;
      }

      console.log(`Found ${tomorrowEvents.length} events tomorrow`);

      const { useNotificationStore } =
        await import("@/stores/notificationStore");
      const { addNotification } = useNotificationStore.getState();

      for (const post of tomorrowEvents) {
        if (!post.eventDate) continue;

        const eventDate = new Date(post.eventDate);
        const postId = getPostId(post);

        const formattedDate = eventDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        addNotification({
          id: `reminder-${postId}-${today}`,
          title: post.title,
          message: getReminderMessage(post, formattedDate),
          type: "EVENT_REMINDER",
          data: { postId },
          createdAt: new Date().toISOString(),
          isRead: false,
        });

        console.log(`Reminder added to bell for: ${post.title}`);
      }

      this.lastCheckedDate = today;
    } catch (e: any) {
      console.log("Event reminder error:", e?.message);
    }
  }

  private async syncScheduledNotifications(posts: Post[], now: Date) {
    if (Platform.OS === "web") return;

    try {
      const isAllowed = await hasNotificationPermission();
      if (!isAllowed) return;

      await ensureNotificationChannel();

      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const scheduledIds = new Set(
        scheduled
          .map((notification) => notification.identifier)
          .filter((id): id is string => Boolean(id)),
      );
      const storedKeys = await readStoredReminderKeys();
      let storedKeysChanged = false;

      for (const post of posts) {
        const postId = getPostId(post);
        if (!postId) continue;

        const notificationId = getReminderNotificationId(postId);
        const eventDateValue = post.eventDate;
        const shouldCancelExisting =
          post.reminderEnabled === false || !eventDateValue;

        if (shouldCancelExisting) {
          if (scheduledIds.has(notificationId)) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
          }

          if (storedKeys[notificationId]) {
            delete storedKeys[notificationId];
            storedKeysChanged = true;
          }

          continue;
        }

        const eventDate = new Date(eventDateValue);
        if (Number.isNaN(eventDate.getTime())) continue;

        const reminderDate = getLocalReminderDate(eventDate, now);
        const reminderKey = `${postId}:${getDayKey(eventDate)}`;

        if (!reminderDate) {
          if (scheduledIds.has(notificationId)) {
            await Notifications.cancelScheduledNotificationAsync(notificationId);
          }

          continue;
        }

        const isCatchUpReminder =
          reminderDate.getTime() - now.getTime() <= CATCH_UP_WINDOW_MS;

        if (isCatchUpReminder && storedKeys[notificationId] === reminderKey) {
          continue;
        }

        if (scheduledIds.has(notificationId)) {
          await Notifications.cancelScheduledNotificationAsync(notificationId);
        }

        const formattedDate = eventDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        await Notifications.scheduleNotificationAsync({
          identifier: notificationId,
          content: {
            title: post.title || "Event reminder",
            body: getReminderMessage(post, formattedDate),
            data: {
              postId,
              type: "EVENT_REMINDER",
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            color: "#D71920",
            vibrate: [0, 180, 120, 180],
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderDate,
            channelId: NOTIFICATION_CHANNEL_ID,
          },
        });

        storedKeys[notificationId] = reminderKey;
        storedKeysChanged = true;
        console.log(
          `Scheduled event reminder for ${post.title}: ${reminderDate.toISOString()}`,
        );
      }

      if (storedKeysChanged) {
        await writeStoredReminderKeys(storedKeys);
      }
    } catch (e: any) {
      console.log("Event reminder schedule error:", e?.message);
    }
  }
}

export const eventReminderService = new EventReminderService();
