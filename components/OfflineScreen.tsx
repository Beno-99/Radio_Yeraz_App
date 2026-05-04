import * as Network from "expo-network";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export function OfflineScreen() {
  //   const { setManualOffline } = useContext(NetworkContext);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  // For testing purposes, allows us to force offline mode

  //   const handleRetry = async () => {
  //     setChecking(true);
  //     setMessage("");

  //     try {
  //       await new Promise((resolve) => setTimeout(resolve, 1500));
  //       const networkState = await Network.getNetworkStateAsync();
  //       const isOnline =
  //         networkState.isConnected && networkState.isInternetReachable;

  //       if (isOnline) {
  //         setMessage("Connected! Reloading...");
  //         // Wait briefly so user sees the message, then reload
  //         await new Promise((resolve) => setTimeout(resolve, 800));
  //         setManualOffline(false); // This triggers the context to re-evaluate and show the app
  //       } else {
  //         setMessage("Still offline. Try again.");
  //       }
  //     } catch {
  //       setMessage("Could not check connection.");
  //     } finally {
  //       setChecking(false);
  //     }
  //   };

  const handleRetry = async () => {
    setChecking(true);
    setMessage("");

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const networkState = await Network.getNetworkStateAsync();
      const isOnline =
        networkState.isConnected && networkState.isInternetReachable;

      if (isOnline) {
        setMessage("Connected!");
        // We don't need to manually set states anymore;
        // the NetworkProvider will detect the connection and
        // automatically remove the OfflineScreen for us.
      } else {
        setMessage("Still offline. Try again.");
      }
    } catch {
      setMessage("Could not check connection.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Watermark Logo */}
      <Image
        source={require("@/assets/images/radioLogoOrg.png")}
        style={styles.watermark}
        resizeMode="contain"
      />

      {/* Disconnected Icon — no animation */}
      <Image
        source={require("@/assets/images/Disconnect-PNG.png")}
        style={styles.disconnected}
        resizeMode="contain"
      />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title}>You are offline</Text>
        <Text style={styles.subtitle}>
          Please check your connection and try again.
        </Text>

        {/* Status Message */}
        {message !== "" && (
          <Text
            style={[
              styles.message,
              {
                color: message.includes("Connected") ? "#4caf50" : "#e74c3c",
              },
            ]}
          >
            {message}
          </Text>
        )}

        {/* Retry Button */}
        <TouchableOpacity
          style={[styles.button, checking && styles.buttonDisabled]}
          onPress={handleRetry}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Try Again</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0e17",
  },
  watermark: {
    position: "absolute",
    width: 200,
    height: 200,
    top: "66%",
    right: "27%",
    alignSelf: "center",
    opacity: 0.1,
  },
  disconnected: {
    width: 110,
    height: 110,
    marginBottom: 32,
    opacity: 0.9,
  },
  content: {
    alignItems: "center",
    zIndex: 1,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "white",
  },
  subtitle: {
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  message: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#1e2a3a",
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 30,
    minWidth: 150,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2e3f55",
  },
  buttonDisabled: {
    backgroundColor: "#111825",
    borderColor: "#1a2535",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
});
