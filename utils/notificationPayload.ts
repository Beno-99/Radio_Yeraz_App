const POST_ID_KEYS = ["postId", "post_id", "targetPostId", "target_post_id"];
const FALLBACK_POST_ID_KEYS = ["id", "_id"];
const TITLE_KEYS = ["title", "postTitle", "post_title", "name"];
const MESSAGE_KEYS = ["description", "message", "body"];

type RemoteNotificationText = {
  title?: string | null;
  body?: string | null;
};

export type NormalizedNotificationPayload = {
  id?: string;
  _id?: string;
  title: string;
  message: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
  postId: string;
  isLivePost: boolean;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const parseJsonRecord = (value: unknown) => {
  if (isRecord(value)) return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const normalizeNotificationId = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const pickString = (record: Record<string, unknown> | null, keys: string[]) => {
  if (!record) return "";

  for (const key of keys) {
    const value = normalizeNotificationId(record[key]);
    if (value) return value;
  }

  return "";
};

export const getNotificationType = (data: unknown) => {
  const record = parseJsonRecord(data);
  if (!record) return "";

  return normalizeNotificationId(
    record.type || record.notificationType || record.entityType || record.action,
  ).toUpperCase();
};

export const isLivePostNotificationType = (type: unknown) => {
  const normalizedType = normalizeNotificationId(type).toUpperCase();
  return (
    normalizedType === "POST_LIVE" ||
    normalizedType === "POST_STARTED_LIVE" ||
    normalizedType === "LIVE_POST" ||
    normalizedType === "LIVE_STREAM_STARTED" ||
    (normalizedType.includes("POST") && normalizedType.includes("LIVE"))
  );
};

const isNewPostNotificationType = (type: unknown) => {
  const normalizedType = normalizeNotificationId(type).toUpperCase();
  return (
    normalizedType === "NEW_POST" ||
    normalizedType === "POST_CREATED" ||
    normalizedType === "CREATE_POST" ||
    normalizedType === "POST_PUBLISHED" ||
    normalizedType === "PUBLISHED_POST" ||
    (normalizedType.includes("POST") &&
      (normalizedType.includes("CREATE") ||
        normalizedType.includes("CREATED") ||
        normalizedType.includes("PUBLISH") ||
        normalizedType.includes("PUBLISHED") ||
        normalizedType.includes("NEW")))
  );
};

export const findPostIdInRecord = (record: Record<string, unknown>): string => {
  for (const key of POST_ID_KEYS) {
    const postId = normalizeNotificationId(record[key]);
    if (postId) return postId;
  }

  const nestedPost = parseJsonRecord(record.post);
  if (nestedPost) {
    for (const key of [...POST_ID_KEYS, ...FALLBACK_POST_ID_KEYS]) {
      const postId = normalizeNotificationId(nestedPost[key]);
      if (postId) return postId;
    }
  } else {
    const postId = normalizeNotificationId(record.post);
    if (postId) return postId;
  }

  const nestedData = parseJsonRecord(record.data);
  if (nestedData) {
    const postId = findPostIdInRecord(nestedData);
    if (postId) return postId;
  }

  const notificationType = getNotificationType(record);
  if (notificationType.includes("POST") || notificationType.includes("LIVE")) {
    for (const key of FALLBACK_POST_ID_KEYS) {
      const postId = normalizeNotificationId(record[key]);
      if (postId) return postId;
    }
  }

  return "";
};

export const getPostIdFromNotificationData = (data: unknown) => {
  const record = parseJsonRecord(data);
  return record ? findPostIdInRecord(record) : "";
};

const getPostTitle = (record: Record<string, unknown>) => {
  const directTitle = pickString(record, TITLE_KEYS);
  if (directTitle) return directTitle;

  const nestedPost = parseJsonRecord(record.post);
  return pickString(nestedPost, TITLE_KEYS);
};

export const normalizeNotificationPayload = ({
  fallbackId,
  notification,
  rawData,
}: {
  fallbackId?: string;
  notification?: RemoteNotificationText | null;
  rawData?: unknown;
}): NormalizedNotificationPayload | null => {
  const rawRecord = parseJsonRecord(rawData) ?? {};
  const parsedData = parseJsonRecord(rawRecord.data);
  const mergedData = parsedData ? { ...rawRecord, ...parsedData } : { ...rawRecord };

  const type = getNotificationType(mergedData) || "GENERAL";
  const postId =
    getPostIdFromNotificationData(mergedData) ||
    getPostIdFromNotificationData(rawRecord);
  const isLivePost = isLivePostNotificationType(type);
  const isNewPost = isNewPostNotificationType(type);
  const postTitle = getPostTitle(mergedData) || getPostTitle(rawRecord);

  const title =
    (isNewPost ? "Radio Yeraz shared a new post" : "") ||
    pickString(rawRecord, ["title"]) ||
    pickString(mergedData, ["title"]) ||
    normalizeNotificationId(notification?.title) ||
    (isLivePost ? "Radio Yeraz is live" : "Notification");

  const message =
    (isNewPost
      ? postTitle || "Tap to read the latest update."
      : "") ||
    pickString(rawRecord, MESSAGE_KEYS) ||
    pickString(mergedData, MESSAGE_KEYS) ||
    normalizeNotificationId(notification?.body) ||
    (isLivePost
      ? postTitle
        ? `Tap to watch ${postTitle}.`
        : "Tap to watch the live stream."
      : "");

  if (postId) {
    mergedData.postId = postId;
  }
  mergedData.type = type;

  return {
    id:
      normalizeNotificationId(
        rawRecord.id ||
          rawRecord._id ||
          rawRecord.notificationId ||
          rawRecord.notification_id ||
          fallbackId,
      ) || undefined,
    _id: normalizeNotificationId(rawRecord._id) || undefined,
    title,
    message,
    type,
    data: mergedData,
    createdAt:
      normalizeNotificationId(rawRecord.createdAt || rawRecord.created_at) ||
      new Date().toISOString(),
    postId,
    isLivePost,
  };
};
