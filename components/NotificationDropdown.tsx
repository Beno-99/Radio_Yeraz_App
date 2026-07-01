// components/NotificationDropdown.tsx
import { useNavigationStore } from "@/stores/navigationStore";
import {
  AppNotification,
  useNotificationStore,
} from "@/stores/notificationStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const timeAgo = (dateStr: string) => {
  const now = new Date();
  const past = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (!Number.isFinite(seconds)) return "recent";
  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

const typeIcon: Record<string, keyof typeof Ionicons.glyphMap> = {
  NEW_POST: "megaphone-outline",
  POST_UPDATED: "create-outline",
  POST_DELETED: "trash-outline",
  POST_PUBLISHED: "checkmark-circle-outline",
  EVENT_REMINDER: "calendar-outline",
  CAROUSEL_CREATED: "images-outline",
  CAROUSEL_UPDATED: "create-outline",
  CAROUSEL_DELETED: "trash-outline",
  CAROUSEL_TOGGLED: "sync-outline",
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onMarkRead?: (id: string) => void;
  onNotificationPress?: (postId: string) => void;
}

export default function NotificationDropdown({
  visible,
  onClose,
  onMarkAllRead,
  onMarkRead,
  onNotificationPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const { notifications } = useNotificationStore();
  const { setTargetPostId } = useNavigationStore();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  const handleNotificationPress = (item: AppNotification) => {
    onMarkRead?.(item.id || item._id || "");
    onClose();

    if (item.data?.postId) {
      const postId = String(item.data.postId);
      onNotificationPress?.(postId);
      setTargetPostId(postId);
      router.push({
        pathname: "/post/[id]",
        params: { id: postId },
      });
    }
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(-20);
    }
  }, [fadeAnim, slideAnim, visible]);

  const renderItem = ({ item }: { item: AppNotification }) => {
    const showMessage =
      item.type === "EVENT_REMINDER" ||
      item.type === "NEW_POST" ||
      item.type === "POST_PUBLISHED";

    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.isRead && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={typeIcon[item.type] || "notifications-outline"}
          size={20}
          color="#e94560"
          style={styles.notifIcon}
        />
        <View style={styles.notifContent}>
          <Text style={styles.notifTitle} numberOfLines={3}>
            {item.title}
          </Text>
          {showMessage && item.message ? (
            <Text style={styles.notifMessage} numberOfLines={2}>
              {item.message}
            </Text>
          ) : null}
          <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
        </View>
        {!item.isRead ? <View style={styles.unreadDot} /> : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View
        style={[
          styles.dropdown,
          {
            top: insets.top + 60,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <TouchableOpacity onPress={onMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons
              name="notifications-outline"
              size={32}
              color="#6b7280"
            />
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderItem}
            keyExtractor={(item, index) =>
              item.id?.toString() ||
              item._id?.toString() ||
              `${item.createdAt}-${index}`
            }
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  dropdown: {
    position: "absolute",
    right: 12,
    width: 320,
    maxHeight: 420,
    backgroundColor: "#1a2035",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  markAllText: { color: "#e94560", fontSize: 13 },
  list: { maxHeight: 360 },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    gap: 10,
  },
  unreadItem: { backgroundColor: "rgba(233,69,96,0.06)" },
  notifIcon: { marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 3,
    lineHeight: 18,
  },
  notifTime: { color: "#6b7280", fontSize: 11, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e94560",
    marginTop: 6,
  },
  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { color: "#6b7280", fontSize: 14 },
  notifMessage: {
    color: "#d1d5db",
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 2,
  },
});
