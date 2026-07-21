import {
  getNetworkStateAsync,
  NetworkStateType,
  useNetworkState,
  type NetworkState,
} from "expo-network";
import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";

const OFFLINE_CONFIRM_DELAY_MS = 800;
const REACHABILITY_CHECK_INTERVAL_MS = 5000;
const REACHABILITY_TIMEOUT_MS = 3500;
const REACHABILITY_URLS = [
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/api\/?$/, "") || "",
  process.env.EXPO_PUBLIC_STREAM_METADATA_URL || "",
  "https://www.gstatic.com/generate_204",
].filter(Boolean);

export type NetworkStatus = "checking" | "online" | "offline";

type NetworkContextValue = {
  isChecking: boolean;
  isOffline: boolean;
  isOnline: boolean;
  networkStatus: NetworkStatus;
  refreshNetworkStatus: () => Promise<NetworkStatus>;
};

const defaultNetworkValue: NetworkContextValue = {
  isChecking: true,
  isOffline: false,
  isOnline: false,
  networkStatus: "checking",
  refreshNetworkStatus: async () => "checking",
};

export const NetworkContext =
  createContext<NetworkContextValue>(defaultNetworkValue);

function getObservedNetworkStatus(networkState: NetworkState): NetworkStatus {
  if (
    networkState.type === NetworkStateType.NONE ||
    networkState.isConnected === false
  ) {
    return "offline";
  }

  if (
    networkState.type === NetworkStateType.UNKNOWN ||
    networkState.isConnected === undefined ||
    networkState.isInternetReachable === undefined
  ) {
    return "checking";
  }

  if (networkState.isInternetReachable === false) {
    return "offline";
  }

  return "online";
}

async function fetchReachabilityUrl(url: string, signal: AbortSignal) {
  try {
    const response = await fetch(url, {
      cache: "no-store",
      method: "HEAD",
      signal,
    });

    return response.ok || response.status === 204 || response.status === 405;
  } catch {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        method: "GET",
        signal,
      });

      return response.ok || response.status === 204;
    } catch {
      return false;
    }
  }
}

async function canReachInternet() {
  if (REACHABILITY_URLS.length === 0) return true;

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, REACHABILITY_TIMEOUT_MS);

  try {
    const checks = REACHABILITY_URLS.map((url) =>
      fetchReachabilityUrl(url, controller.signal),
    );
    const results = await Promise.all(checks);
    return results.some(Boolean);
  } finally {
    clearTimeout(timeout);
  }
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const networkState = useNetworkState();
  const { isConnected, isInternetReachable, type } = networkState;
  const [networkStatus, setNetworkStatus] =
    useState<NetworkStatus>("checking");
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshInFlightRef = useRef(false);

  const clearOfflineTimer = useCallback(() => {
    if (!offlineTimerRef.current) return;
    clearTimeout(offlineTimerRef.current);
    offlineTimerRef.current = null;
  }, []);

  const applyNetworkStatus = useCallback(
    (observedStatus: NetworkStatus) => {
      clearOfflineTimer();

      if (observedStatus !== "offline") {
        setNetworkStatus(observedStatus);
        return;
      }

      offlineTimerRef.current = setTimeout(() => {
        setNetworkStatus("offline");
        offlineTimerRef.current = null;
      }, OFFLINE_CONFIRM_DELAY_MS);
    },
    [clearOfflineTimer],
  );

  const refreshNetworkStatus = useCallback(async () => {
    const freshState = await getNetworkStateAsync();
    let observedStatus = getObservedNetworkStatus(freshState);

    if (observedStatus !== "offline") {
      observedStatus = (await canReachInternet()) ? "online" : "offline";
    }

    applyNetworkStatus(observedStatus);
    return observedStatus;
  }, [applyNetworkStatus]);

  useEffect(() => {
    const observedStatus = getObservedNetworkStatus({
      isConnected,
      isInternetReachable,
      type,
    });
    applyNetworkStatus(observedStatus);
  }, [applyNetworkStatus, isConnected, isInternetReachable, type]);

  useEffect(() => {
    return () => {
      clearOfflineTimer();
    };
  }, [clearOfflineTimer]);

  useEffect(() => {
    const checkNow = () => {
      if (refreshInFlightRef.current) return;

      refreshInFlightRef.current = true;
      refreshNetworkStatus()
        .catch(() => {
          applyNetworkStatus("offline");
        })
        .finally(() => {
          refreshInFlightRef.current = false;
        });
    };

    checkNow();

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          checkNow();
        }
      },
    );
    const interval = setInterval(checkNow, REACHABILITY_CHECK_INTERVAL_MS);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [applyNetworkStatus, refreshNetworkStatus]);

  const value = useMemo<NetworkContextValue>(
    () => ({
      isChecking: networkStatus === "checking",
      isOffline: networkStatus === "offline",
      isOnline: networkStatus === "online",
      networkStatus,
      refreshNetworkStatus,
    }),
    [networkStatus, refreshNetworkStatus],
  );

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}
