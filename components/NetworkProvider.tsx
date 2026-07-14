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

const OFFLINE_CONFIRM_DELAY_MS = 1500;

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

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const networkState = useNetworkState();
  const { isConnected, isInternetReachable, type } = networkState;
  const [networkStatus, setNetworkStatus] =
    useState<NetworkStatus>("checking");
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const observedStatus = getObservedNetworkStatus(freshState);
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
    void refreshNetworkStatus();

    const subscription = AppState.addEventListener(
      "change",
      (state: AppStateStatus) => {
        if (state === "active") {
          void refreshNetworkStatus();
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [refreshNetworkStatus]);

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
