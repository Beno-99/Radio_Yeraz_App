import {
  dismissNotificationPermissionPrompt,
  requestRadioYerazNotificationPermission,
  shouldShowNotificationPermissionPrompt,
} from "@/services/notificationPermissions.service";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const PROMPT_DELAY_MS = 900;

export default function NotificationPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      shouldShowNotificationPermissionPrompt()
        .then((shouldShow) => {
          if (mounted) setVisible(shouldShow);
        })
        .catch(() => {
          if (mounted) setVisible(false);
        });
    }, PROMPT_DELAY_MS);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  const handleNotNow = async () => {
    setVisible(false);
    await dismissNotificationPermissionPrompt();
  };

  const handleAllow = async () => {
    setRequesting(true);
    await requestRadioYerazNotificationPermission();
    setRequesting(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="notifications-outline" size={22} color="#ff6b81" />
      </View>
      <View style={styles.content}>
        <View style={styles.copy}>
          <Text style={styles.title}>Stay close to Radio Yeraz</Text>
          <Text style={styles.text}>
            Get live updates and event reminders when something new is ready.
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={requesting}
            onPress={handleNotNow}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Not now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={requesting}
            onPress={handleAllow}
            style={styles.primaryButton}
          >
            {requesting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryText}>Allow</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 94,
    zIndex: 50,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 12,
  },
  copy: {
    flex: 1,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233,69,96,0.12)",
    borderWidth: 1,
    borderColor: "rgba(233,69,96,0.22)",
  },
  primaryButton: {
    minWidth: 72,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#e94560",
    paddingHorizontal: 14,
  },
  primaryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
  },
  secondaryText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
  },
  text: {
    color: "#aeb8ca",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  title: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
});
