const NOTIFICATION_OPEN_INTENT_TTL_MS = 7000;

let notificationOpenIntentUntil = 0;

export const markNotificationOpenIntent = () => {
  notificationOpenIntentUntil = Date.now() + NOTIFICATION_OPEN_INTENT_TTL_MS;
};

export const hasRecentNotificationOpenIntent = () => {
  return Date.now() < notificationOpenIntentUntil;
};
