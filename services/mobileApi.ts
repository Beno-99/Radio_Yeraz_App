import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { fetchWithBrowserApiFallback } from "./browserApiFallback";

const DEFAULT_API_URL = "https://api.radioyeraz.com/api";
const DEFAULT_MEDIA_URL = "https://api.radioyeraz.com";
const DEFAULT_SOCKET_URL = "https://api.radioyeraz.com";
const REQUEST_TIMEOUT_MS = 15000;
const CONTENT_UNAVAILABLE_MESSAGE =
  "Content is unavailable right now. Please try again soon.";
const BOT_PROTECTION_PATTERN =
  /<!doctype html|<html[\s>]|imunify360|bot-protection|whitelisted|request is being verified|please wait|setTimeout\(function/i;
const JSON_STRING_PATTERN = /^\s*[\[{]/;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const resolvePublicUrl = (
  configured: string | undefined,
  fallback: string,
  label: string,
) => {
  const normalized = trimTrailingSlash(configured || fallback);

  try {
    const parsed = new URL(normalized);
    if (__DEV__ && parsed.protocol !== "https:") {
      console.warn(`${label} should use HTTPS in production.`);
    }
    return normalized;
  } catch {
    if (__DEV__) {
      console.warn(`${label} is invalid. Falling back to ${fallback}.`);
    }
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
const API_HOST = new URL(API_ORIGIN).host;
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
    Accept: "application/json",
    "Accept-Language": "en-US,en;q=0.9",
  },
});

const getPublicServerMessage = (message?: string) => {
  if (!message) return "The server is unavailable. Please try again.";

  if (BOT_PROTECTION_PATTERN.test(message)) {
    return CONTENT_UNAVAILABLE_MESSAGE;
  }

  return message;
};

const parseJsonStringPayload = (payload: unknown): unknown => {
  if (typeof payload !== "string") return payload;

  const trimmed = payload.trim();
  if (!JSON_STRING_PATTERN.test(trimmed)) return payload;

  try {
    return JSON.parse(trimmed);
  } catch {
    return payload;
  }
};

const isProtectedBrowserChallenge = (payload: unknown) =>
  typeof payload === "string" && BOT_PROTECTION_PATTERN.test(payload);

function normalizeApiError(error: unknown): MobileApiError {
  if (!axios.isAxiosError(error)) {
    return new MobileApiError("Something went wrong.", "unknown");
  }

  const axiosError = error as AxiosError<{ message?: string } | string>;

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
  const responseData = axiosError.response.data;
  const serverMessage =
    typeof responseData === "string" ? responseData : responseData?.message;

  return new MobileApiError(
    getPublicServerMessage(serverMessage),
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function extractApiArray<T>(payload: unknown, depth = 0): T[] {
  const normalizedPayload = parseJsonStringPayload(payload);

  if (Array.isArray(normalizedPayload)) return normalizedPayload as T[];

  if (depth > 3 || !isRecord(normalizedPayload)) return [];

  const arrayKeys = ["data", "posts", "items", "value", "results", "docs"];
  for (const key of arrayKeys) {
    if (Array.isArray(normalizedPayload[key])) return normalizedPayload[key] as T[];
  }

  const nestedKeys = ["data", "payload", "result", "value"];
  for (const key of nestedKeys) {
    const nested = extractApiArray<T>(normalizedPayload[key], depth + 1);
    if (nested.length > 0) return nested;
  }

  return [];
}

export function extractApiItem<T>(
  payload: unknown,
  preferredKeys: string[] = [],
): T | null {
  const normalizedPayload = parseJsonStringPayload(payload);

  if (!isRecord(normalizedPayload)) return null;

  const itemKeys = [
    ...preferredKeys,
    "post",
    "item",
    "document",
    "record",
    "result",
    "value",
  ];

  const findNestedItem = (record: Record<string, unknown>): T | null => {
    for (const key of itemKeys) {
      if (isRecord(record[key])) return record[key] as T;
    }

    return null;
  };

  const nestedData = isRecord(normalizedPayload.data)
    ? normalizedPayload.data
    : null;
  if (nestedData) {
    return findNestedItem(nestedData) || (nestedData as T);
  }

  const directNestedItem = findNestedItem(normalizedPayload);
  if (directNestedItem) return directNestedItem;

  const looksLikeEnvelope =
    "success" in normalizedPayload ||
    "message" in normalizedPayload ||
    "data" in normalizedPayload;

  return looksLikeEnvelope ? null : (normalizedPayload as T);
}

function getMessageOnlyResponseError(responseData: unknown) {
  const normalizedData = parseJsonStringPayload(responseData);

  if (!isRecord(normalizedData)) {
    return null;
  }

  const hasArrayPayload =
    extractApiArray(normalizedData).length > 0 ||
    Boolean(extractApiItem(normalizedData));

  if (
    hasArrayPayload ||
    normalizedData.success === true ||
    typeof normalizedData.message !== "string"
  ) {
    return null;
  }

  return normalizedData.message;
}

const buildAbsoluteRequestUrl = (config: InternalAxiosRequestConfig) => {
  const requestUrl = axios.getUri(config);
  return new URL(requestUrl, config.baseURL || API_URL).toString();
};

const canUseBrowserFallback = (config: InternalAxiosRequestConfig) => {
  const method = (config.method || "get").toLowerCase();
  if (method !== "get") return false;

  try {
    return new URL(buildAbsoluteRequestUrl(config)).host === API_HOST;
  } catch {
    return false;
  }
};

async function normalizeApiResponse(response: AxiosResponse) {
  const parsedData = parseJsonStringPayload(response.data);
  if (parsedData !== response.data) {
    response.data = parsedData;
  }

  if (!isProtectedBrowserChallenge(response.data)) {
    return response;
  }

  if (!canUseBrowserFallback(response.config)) {
    throw new MobileApiError(
      CONTENT_UNAVAILABLE_MESSAGE,
      "server",
      response.status,
    );
  }

  try {
    const fallbackResponse = await fetchWithBrowserApiFallback({
      timeoutMs: REQUEST_TIMEOUT_MS,
      url: buildAbsoluteRequestUrl(response.config),
    });
    const fallbackData = parseJsonStringPayload(fallbackResponse.body);

    if (
      isProtectedBrowserChallenge(fallbackData) ||
      typeof fallbackData === "string"
    ) {
      throw new Error("Browser fallback did not return JSON.");
    }

    response.data = fallbackData;
    response.status = fallbackResponse.status || response.status;
    return response;
  } catch (error) {
    if (__DEV__) {
      console.warn("[API] Browser fallback failed:", error);
    }

    throw new MobileApiError(
      CONTENT_UNAVAILABLE_MESSAGE,
      "server",
      response.status,
    );
  }
}

mobileApi.interceptors.response.use(
  async (response) => {
    const normalizedResponse = await normalizeApiResponse(response);
    const messageOnlyError = getMessageOnlyResponseError(response.data);

    if (messageOnlyError) {
      return Promise.reject(
        new MobileApiError(
          getPublicServerMessage(messageOnlyError),
          "server",
          response.status,
        ),
      );
    }

    return normalizedResponse;
  },
  (error) => Promise.reject(normalizeApiError(error)),
);
