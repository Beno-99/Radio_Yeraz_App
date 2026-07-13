import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp } from "@react-native-firebase/app";
import {
  AuthorizationStatus,
  type FirebaseMessagingTypes,
  getMessaging,
  hasPermission,
  requestPermission,
} from "@react-native-firebase/messaging";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const NOTIFICATION_PROMPT_SEEN_KEY =
  "radioyeraz:has-seen-notification-permission-prompt";
export const NOTIFICATION_CHANNEL_ID = "radioyeraz-updates";

export type NotificationPermissionResult =
  | "granted"
  | "denied"
  | "unavailable";

const isFirebasePermissionGranted = (
  status: FirebaseMessagingTypes.AuthorizationStatus,
) =>
  status === AuthorizationStatus.AUTHORIZED ||
  status === AuthorizationStatus.PROVISIONAL;

export async function ensureNotificationChannel() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
    description: "Radio Yeraz updates and event reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: "#e94560",
    name: "Radio Yeraz Updates",
    vibrationPattern: [0, 180, 120, 180],
  });
}

async function getFirebasePermissionResult() {
  const app = getApp();
  const messaging = getMessaging(app);
  return hasPermission(messaging);
}

export async function hasNotificationPermission() {
  if (Platform.OS === "web") return false;

  try {
    await ensureNotificationChannel();

    if (Platform.OS === "android") {
      const permissions = await Notifications.getPermissionsAsync();
      return permissions.granted;
    }

    const status = await getFirebasePermissionResult();
    return isFirebasePermissionGranted(status);
  } catch {
    return false;
  }
}

export async function shouldShowNotificationPermissionPrompt() {
  if (Platform.OS === "web") return false;

  const [hasSeenPrompt, isAllowed] = await Promise.all([
    AsyncStorage.getItem(NOTIFICATION_PROMPT_SEEN_KEY),
    hasNotificationPermission(),
  ]);

  return hasSeenPrompt !== "true" && !isAllowed;
}

export async function dismissNotificationPermissionPrompt() {
  await AsyncStorage.setItem(NOTIFICATION_PROMPT_SEEN_KEY, "true");
}

export async function requestRadioYerazNotificationPermission(): Promise<NotificationPermissionResult> {
  if (Platform.OS === "web") return "unavailable";

  try {
    await ensureNotificationChannel();
    await dismissNotificationPermissionPrompt();

    if (Platform.OS === "android") {
      const permission = await Notifications.requestPermissionsAsync();
      return permission.granted ? "granted" : "denied";
    }

    const app = getApp();
    const messaging = getMessaging(app);
    const status = await requestPermission(messaging);

    return isFirebasePermissionGranted(status) ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}
