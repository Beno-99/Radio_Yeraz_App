import axios, { AxiosError } from "axios";

const DEFAULT_API_URL = "https://api.radioyeraz.com/api";
const REQUEST_TIMEOUT_MS = 15000;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const resolveApiUrl = () => {
  const configured = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;

  const normalized = trimTrailingSlash(configured);

  if (!normalized.startsWith("https://")) {
    console.warn("API URL should use HTTPS in production.");
  }

  return normalized;
};

const resolveApiOrigin = (apiUrl: string) => {
  try {
    return new URL(apiUrl).origin;
  } catch {
    return new URL(DEFAULT_API_URL).origin;
  }
};

export const API_URL = resolveApiUrl();
export const API_ORIGIN = resolveApiOrigin(API_URL);
export const IMAGE_URL = API_ORIGIN;

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

mobileApi.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(normalizeApiError(error)),
);
