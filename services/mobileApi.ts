import axios, { AxiosError } from "axios";

const DEFAULT_API_URL = "https://api.radioyeraz.com/api";
const DEFAULT_MEDIA_URL = "https://api.radioyeraz.com";
const DEFAULT_SOCKET_URL = "https://api.radioyeraz.com";
const REQUEST_TIMEOUT_MS = 15000;
const MOBILE_USER_AGENT =
  "RadioYeraz/1.0 (Android; React Native) Mobile";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const resolvePublicUrl = (
  configured: string | undefined,
  fallback: string,
  label: string,
) => {
  const normalized = trimTrailingSlash(configured || fallback);

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "https:") {
      console.warn(`${label} should use HTTPS in production.`);
    }
    return normalized;
  } catch {
    console.warn(`${label} is invalid. Falling back to ${fallback}.`);
    return fallback;
  }
};

const resolveApiOrigin = (apiUrl: string) => {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return new URL(DEFAULT_API_URL).origin;
  }
};

export const API_URL = resolvePublicUrl(
  process.env.EXPO_PUBLIC_API_URL,
  DEFAULT_API_URL,
  "API URL",
);
export const API_ORIGIN = resolveApiOrigin(API_URL);
export const MEDIA_URL = resolvePublicUrl(
  process.env.EXPO_PUBLIC_MEDIA_URL,
  DEFAULT_MEDIA_URL,
  "Media URL",
);
export const IMAGE_URL = MEDIA_URL;
export const SOCKET_URL = resolvePublicUrl(
  process.env.EXPO_PUBLIC_SOCKET_URL,
  DEFAULT_SOCKET_URL,
  "Socket URL",
);

export type MobileApiErrorCode =
  | "timeout"
  | "network"
  | "server"
  | "cancelled"
  | "unknown";

export class MobileApiError extends Error {
  code: MobileApiErrorCode;
  status?: number;

  constructor(message: string, code: MobileApiErrorCode, status?: number) {
    super(message);
    this.name = "MobileApiError";
    this.code = code;
    this.status = status;
  }
}

export const mobileApi = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "User-Agent": MOBILE_USER_AGENT,
    "X-Requested-With": "com.radioyeraz.radioyeraz",
  },
});

function normalizeApiError(error: unknown): MobileApiError {
  if (!axios.isAxiosError(error)) {
    return new MobileApiError("Something went wrong.", "unknown");
  }

  const axiosError = error as AxiosError<{ message?: string }>;

  if (axiosError.code === "ERR_CANCELED") {
    return new MobileApiError("Request cancelled.", "cancelled");
  }

  if (axiosError.code === "ECONNABORTED") {
    return new MobileApiError("The request timed out. Please try again.", "timeout");
  }

  if (!axiosError.response) {
    return new MobileApiError("Please check your internet connection.", "network");
  }

  const status = axiosError.response.status;
  const serverMessage = axiosError.response.data?.message;

  return new MobileApiError(
    serverMessage || "The server is unavailable. Please try again.",
    "server",
    status,
  );
}

export function isCancelledApiError(error: unknown) {
  return error instanceof MobileApiError && error.code === "cancelled";
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof MobileApiError) return error.message;
  return "Something went wrong. Please try again.";
}

export function extractApiArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (payload && typeof payload === "object") {
    const record = payload as {
      data?: unknown;
      posts?: unknown;
      items?: unknown;
      value?: unknown;
    };

    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.posts)) return record.posts as T[];
    if (Array.isArray(record.items)) return record.items as T[];
    if (Array.isArray(record.value)) return record.value as T[];
  }

  return [];
}

function getMessageOnlyResponseError(responseData: unknown) {
  if (!responseData || typeof responseData !== "object" || Array.isArray(responseData)) {
    return null;
  }

  const record = responseData as {
    data?: unknown;
    posts?: unknown;
    items?: unknown;
    value?: unknown;
    success?: unknown;
    message?: unknown;
  };

  const hasArrayPayload =
    Array.isArray(record.data) ||
    Array.isArray(record.posts) ||
    Array.isArray(record.items) ||
    Array.isArray(record.value);

  if (hasArrayPayload || record.success === true || typeof record.message !== "string") {
    return null;
  }

  return record.message;
}

mobileApi.interceptors.response.use(
  (response) => {
    const messageOnlyError = getMessageOnlyResponseError(response.data);

    if (messageOnlyError) {
      return Promise.reject(
        new MobileApiError(messageOnlyError, "server", response.status),
      );
    }

    return response;
  },
  (error) => Promise.reject(normalizeApiError(error)),
);
