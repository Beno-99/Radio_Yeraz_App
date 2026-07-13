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
  useState,
} from "react";

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
    networkState.type === NetworkStateType.UNKNOWN ||
    networkState.isConnected === undefined ||
    networkState.isInternetReachable === undefined
  ) {
    return "checking";
  }

  if (
    networkState.type === NetworkStateType.NONE ||
    networkState.isConnected === false ||
    networkState.isInternetReachable === false
  ) {
    return "offline";
  }

  return "online";
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const networkState = useNetworkState();
  const [networkStatus, setNetworkStatus] =
    useState<NetworkStatus>("checking");

  const refreshNetworkStatus = useCallback(async () => {
    const freshState = await getNetworkStateAsync();
    const observedStatus = getObservedNetworkStatus(freshState);
    setNetworkStatus(observedStatus);
    return observedStatus;
  }, []);

  useEffect(() => {
    const observedStatus = getObservedNetworkStatus(networkState);

    if (observedStatus !== "offline") {
      setNetworkStatus(observedStatus);
      return;
    }

    const offlineTimer = setTimeout(() => {
      setNetworkStatus("offline");
    }, OFFLINE_CONFIRM_DELAY_MS);

    return () => {
      clearTimeout(offlineTimer);
    };
  }, [
    networkState.isConnected,
    networkState.isInternetReachable,
    networkState.type,
  ]);

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
