import MarbleBackground from "@/components/MarbleBackground";
import { NetworkContext } from "@/components/NetworkProvider";
import React, { useContext, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export function OfflineScreen() {
  const { refreshNetworkStatus } = useContext(NetworkContext);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const handleRetry = async () => {
    setChecking(true);
    setMessage("");

    try {
      const nextStatus = await refreshNetworkStatus();

      if (nextStatus === "online") {
        setMessage("Connected!");
      } else if (nextStatus === "checking") {
        setMessage("Checking connection...");
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
    <MarbleBackground style={styles.container}>
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
    </MarbleBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
