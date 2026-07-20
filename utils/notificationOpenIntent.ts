const NOTIFICATION_OPEN_INTENT_TTL_MS = 7000;

let notificationOpenIntentUntil = 0;
let notificationOpenIntentPostId = "";

export const markNotificationOpenIntent = (postId?: string) => {
  notificationOpenIntentUntil = Date.now() + NOTIFICATION_OPEN_INTENT_TTL_MS;
  notificationOpenIntentPostId = postId ? String(postId).trim() : "";
};

export const hasRecentNotificationOpenIntent = () => {
  return Date.now() < notificationOpenIntentUntil;
};

export const getRecentNotificationOpenPostId = () => {
  if (!hasRecentNotificationOpenIntent()) {
    notificationOpenIntentPostId = "";
    return "";
  }

  return notificationOpenIntentPostId;
};
