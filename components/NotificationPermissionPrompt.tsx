import {
  dismissNotificationPermissionPrompt,
  requestRadioYerazNotificationPermission,
  shouldShowNotificationPermissionPrompt,
} from "@/services/notificationPermissions.service";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
    <Modal transparent visible animationType="fade" onRequestClose={handleNotNow}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-outline" size={24} color="#ff6b81" />
          </View>
          <View style={styles.content}>
            <Text style={styles.title}>Stay close to Radio Yeraz</Text>
            <Text style={styles.text}>
              Allow notifications for new posts, live updates, and event reminders.
            </Text>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 20,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    padding: 22,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.36,
    shadowRadius: 26,
    elevation: 18,
  },
  content: {
    width: "100%",
    alignItems: "center",
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233,69,96,0.12)",
    borderWidth: 1,
    borderColor: "rgba(233,69,96,0.22)",
    marginBottom: 14,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  primaryButton: {
    minWidth: 112,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#e94560",
    paddingHorizontal: 18,
  },
  primaryText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
  secondaryButton: {
    minWidth: 112,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 18,
  },
  secondaryText: {
    color: "#e5e7eb",
    fontSize: 15,
    fontWeight: "700",
  },
  text: {
    maxWidth: 286,
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
});
