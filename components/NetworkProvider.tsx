import { useNetworkState } from "expo-network";
import React, { createContext } from "react";

export const NetworkContext = createContext<{
  isOnline: boolean;
  //   manualOffline: boolean; // For testing purposes, allows us to force offline mode
  //   setManualOffline: (val: boolean) => void; // For testing purposes, allows us to force offline mode
  // }>({ isOnline: true, manualOffline: false, setManualOffline: () => {} }); // For testing purposes, allows us to force offline mode
}>({ isOnline: true });

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  //   const [manualOffline, setManualOffline] = useState(false); // For testing purposes, allows us to force offline mode
  const networkState = useNetworkState();

  // For testing purposes, allows us to force offline mode
  //   const isOnline =
  //     !manualOffline &&
  //     !!(networkState.isConnected && networkState.isInternetReachable);

  // Real-time network detection
  const isOnline = !!(
    networkState.isConnected && networkState.isInternetReachable
  );

  return (
    <NetworkContext.Provider
      //   value={{ isOnline, manualOffline, setManualOffline }}
      value={{ isOnline }}
    >
      {children}
    </NetworkContext.Provider>
  );
}
