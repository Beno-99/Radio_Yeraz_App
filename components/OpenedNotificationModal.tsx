import {
  AppNotification,
  useNotificationStore,
} from "@/stores/notificationStore";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  enabled?: boolean;
};

const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  BROADCAST: "megaphone-outline",
  EVENT_REMINDER: "calendar-outline",
  GENERAL: "notifications-outline",
};

export default function OpenedNotificationModal({ enabled = true }: Props) {
  const openedNotification = useNotificationStore(
    (state) => state.openedNotification,
  );
  const closeOpenedNotification = useNotificationStore(
    (state) => state.closeOpenedNotification,
  );
  const [visibleNotification, setVisibleNotification] =
    useState<AppNotification | null>(null);

  useEffect(() => {
    if (enabled) {
      setVisibleNotification(openedNotification);
    }
  }, [enabled, openedNotification]);

  if (!enabled || !visibleNotification) return null;

  const close = () => {
    setVisibleNotification(null);
    closeOpenedNotification();
  };

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={close} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconShell}>
              <Ionicons
                name={
                  typeIcon[visibleNotification.type] ||
                  "notifications-outline"
                }
                size={24}
                color="#e94560"
              />
            </View>
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>Radio Yeraz notification</Text>
              <Text style={styles.title}>{visibleNotification.title}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={close}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#d1d5db" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.message}>
              {visibleNotification.message || "No message content."}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "78%",
    backgroundColor: "#171d31",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  eyebrow: {
    color: "#8b93a7",
    fontSize: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  heading: {
    flex: 1,
    minWidth: 0,
  },
  iconShell: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(233,69,96,0.12)",
  },
  message: {
    color: "#e5e7eb",
    fontSize: 15,
    lineHeight: 23,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    backgroundColor: "rgba(5,9,18,0.78)",
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 24,
  },
});
